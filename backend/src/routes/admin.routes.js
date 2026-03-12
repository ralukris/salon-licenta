const express = require("express");
const db = require("../config/db");
const { requireAdmin } = require("../middleware/auth.middleware");
const {
  createBooking,
  getAvailableSlotsForSegments,
} = require("../services/booking.service");

const router = express.Router();

router.use(requireAdmin);

function isFutureDateOnly(value) {
  if (!value) return false;

  const inputDate = new Date(value);
  if (Number.isNaN(inputDate.getTime())) return true;

  inputDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return inputDate > today;
}

async function getAffectedAppointments(
  client,
  id_angajat,
  id_locatie,
  data_start,
  data_final
) {
  const result = await client.query(
    `
    SELECT
      ps.id_programare_serviciu,
      ps.id_programare,
      ps.id_serviciu,
      ps.id_angajat,
      ps.data_start,
      ps.data_final,
      p.status,
      c.id_client,
      c.nume AS client_nume,
      c.prenume AS client_prenume,
      s.denumire_serviciu
    FROM programare_servicii ps
    JOIN programari p ON p.id_programare = ps.id_programare
    JOIN servicii s ON s.id_serviciu = ps.id_serviciu
    JOIN clienti c ON c.id_client = p.id_client
    JOIN angajati a ON a.id_angajat = ps.id_angajat
    WHERE ps.id_angajat = $1
      AND a.id_locatie = $2
      AND p.id_locatie = $2
      AND p.status IN ('Confirmata', 'Finalizata')
      AND ($3::timestamp < ps.data_final AND $4::timestamp > ps.data_start)
    ORDER BY ps.data_start ASC
    `,
    [id_angajat, id_locatie, data_start, data_final]
  );

  return result.rows;
}

async function hasUnavailabilityOverlap(
  client,
  id_angajat,
  id_locatie,
  data_start,
  data_final
) {
  const result = await client.query(
    `
    SELECT 1
    FROM indisponibilitati_angajati ia
    JOIN angajati a ON a.id_angajat = ia.id_angajat
    WHERE ia.id_angajat = $1
      AND a.id_locatie = $2
      AND ($3::timestamp < ia.data_final AND $4::timestamp > ia.data_start)
    LIMIT 1
    `,
    [id_angajat, id_locatie, data_start, data_final]
  );

  return result.rows.length > 0;
}

// 1) Lista angajați din salonul adminului
router.get("/admin/angajati", async (req, res) => {
  const id_locatie = req.user.id_locatie;

  try {
    const result = await db.query(
      `
      SELECT
        id_angajat,
        id_locatie,
        nume,
        prenume,
        telefon,
        email,
        specializare,
        salariu,
        activ,
        data_start_program,
        data_nastere
      FROM angajati
      WHERE id_locatie = $1
      ORDER BY nume ASC, prenume ASC
      `,
      [id_locatie]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /admin/angajati:", err.message);
    return res.status(500).json({ error: "Eroare la preluarea angajatilor" });
  }
});

// 2) Adaugă angajat în salonul adminului
router.post("/admin/angajati", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const {
    nume,
    prenume,
    telefon,
    email,
    specializare,
    salariu,
    data_start_program,
    data_nastere,
  } = req.body;

  if (
    !nume ||
    !prenume ||
    !specializare ||
    salariu === undefined ||
    !data_start_program
  ) {
    return res.status(400).json({
      error:
        "Lipsesc campuri obligatorii: nume, prenume, specializare, salariu, data_start_program",
    });
  }

  if (!Number.isFinite(Number(salariu)) || Number(salariu) < 0) {
    return res.status(400).json({ error: "Salariu invalid" });
  }

  if (isFutureDateOnly(data_start_program)) {
    return res.status(400).json({
      error: "Data angajarii nu poate fi in viitor",
    });
  }

  if (data_nastere && isFutureDateOnly(data_nastere)) {
    return res.status(400).json({
      error: "Data nasterii nu poate fi in viitor",
    });
  }

  try {
    const result = await db.query(
      `
      INSERT INTO angajati
        (
          id_locatie,
          nume,
          prenume,
          telefon,
          email,
          specializare,
          salariu,
          activ,
          data_start_program,
          data_nastere
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
      RETURNING
        id_angajat,
        id_locatie,
        nume,
        prenume,
        telefon,
        email,
        specializare,
        salariu,
        activ,
        data_start_program,
        data_nastere
      `,
      [
        id_locatie,
        String(nume).trim(),
        String(prenume).trim(),
        telefon ? String(telefon).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        String(specializare).trim(),
        Number(salariu),
        data_start_program,
        data_nastere || null,
      ]
    );

    return res.status(201).json({
      message: "Angajat adaugat cu succes",
      angajat: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Email deja folosit" });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        error:
          "Date invalide pentru angajat. Verifica data angajarii si data nasterii.",
      });
    }

    return res.status(500).json({ error: "Eroare la adaugarea angajatului" });
  }
});

// 3) Editează angajat doar din salonul adminului
router.patch("/admin/angajati/:id_angajat", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;
  const {
    nume,
    prenume,
    telefon,
    email,
    specializare,
    salariu,
    data_start_program,
    data_nastere,
  } = req.body;

  if (!Number.isInteger(id_angajat)) {
    return res.status(400).json({ error: "id_angajat invalid" });
  }

  if (
    !nume ||
    !prenume ||
    !specializare ||
    salariu === undefined ||
    !data_start_program
  ) {
    return res.status(400).json({
      error:
        "Lipsesc campuri obligatorii: nume, prenume, specializare, salariu, data_start_program",
    });
  }

  if (!Number.isFinite(Number(salariu)) || Number(salariu) < 0) {
    return res.status(400).json({ error: "Salariu invalid" });
  }

  if (isFutureDateOnly(data_start_program)) {
    return res.status(400).json({
      error: "Data angajarii nu poate fi in viitor",
    });
  }

  if (data_nastere && isFutureDateOnly(data_nastere)) {
    return res.status(400).json({
      error: "Data nasterii nu poate fi in viitor",
    });
  }

  try {
    const result = await db.query(
      `
      UPDATE angajati
      SET
        nume = $1,
        prenume = $2,
        telefon = $3,
        email = $4,
        specializare = $5,
        salariu = $6,
        data_start_program = $7,
        data_nastere = $8
      WHERE id_angajat = $9
        AND id_locatie = $10
      RETURNING
        id_angajat,
        id_locatie,
        nume,
        prenume,
        telefon,
        email,
        specializare,
        salariu,
        activ,
        data_start_program,
        data_nastere
      `,
      [
        String(nume).trim(),
        String(prenume).trim(),
        telefon ? String(telefon).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        String(specializare).trim(),
        Number(salariu),
        data_start_program,
        data_nastere || null,
        id_angajat,
        id_locatie,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    }

    return res.json({
      message: "Angajat actualizat",
      angajat: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Email deja folosit" });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        error:
          "Date invalide pentru angajat. Verifica data angajarii si data nasterii.",
      });
    }

    return res.status(500).json({ error: "Eroare la actualizarea angajatului" });
  }
});

// 4) Setează angajat inactiv doar din salonul adminului
router.patch("/admin/angajati/:id_angajat/inactiv", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_angajat)) {
    return res.status(400).json({ error: "id_angajat invalid" });
  }

  try {
    const result = await db.query(
      `
      UPDATE angajati
      SET activ = false
      WHERE id_angajat = $1
        AND id_locatie = $2
      RETURNING
        id_angajat,
        id_locatie,
        nume,
        prenume,
        telefon,
        email,
        specializare,
        salariu,
        activ,
        data_start_program,
        data_nastere
      `,
      [id_angajat, id_locatie]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    }

    return res.json({
      message: "Angajat setat inactiv",
      angajat: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Eroare la actualizarea statusului angajatului" });
  }
});

// 4.1) Lista servicii
router.get("/admin/servicii", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id_serviciu,
        denumire_serviciu,
        pret,
        durata_minute,
        activ
      FROM servicii
      ORDER BY denumire_serviciu ASC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /admin/servicii:", err);
    return res.status(500).json({ error: "Eroare la preluarea serviciilor" });
  }
});

// 4.2) Adaugă serviciu
router.post("/admin/servicii", async (req, res) => {
  const { denumire_serviciu, pret, durata_minute } = req.body;

  if (!denumire_serviciu || pret === undefined || durata_minute === undefined) {
    return res.status(400).json({
      error: "Lipsesc campuri obligatorii: denumire_serviciu, pret, durata_minute",
    });
  }

  if (!Number.isFinite(Number(pret)) || Number(pret) < 0) {
    return res.status(400).json({ error: "Pret invalid" });
  }

  if (!Number.isInteger(Number(durata_minute)) || Number(durata_minute) <= 0) {
    return res.status(400).json({ error: "Durata invalida" });
  }

  try {
    const result = await db.query(
      `
      INSERT INTO servicii (denumire_serviciu, pret, durata_minute, activ)
      VALUES ($1, $2, $3, true)
      RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ
      `,
      [
        String(denumire_serviciu).trim(),
        Number(pret),
        Number(durata_minute),
      ]
    );

    return res.status(201).json({
      message: "Serviciu adaugat cu succes",
      serviciu: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare POST /admin/servicii:", err);

    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Exista deja un serviciu cu aceasta denumire" });
    }

    return res.status(500).json({ error: "Eroare la adaugarea serviciului" });
  }
});

// 4.3) Editează serviciu
router.patch("/admin/servicii/:id_serviciu", async (req, res) => {
  const id_serviciu = Number(req.params.id_serviciu);
  const { denumire_serviciu, pret, durata_minute } = req.body;

  if (!Number.isInteger(id_serviciu)) {
    return res.status(400).json({ error: "id_serviciu invalid" });
  }

  if (!denumire_serviciu || pret === undefined || durata_minute === undefined) {
    return res.status(400).json({
      error: "Lipsesc campuri obligatorii: denumire_serviciu, pret, durata_minute",
    });
  }

  if (!Number.isFinite(Number(pret)) || Number(pret) < 0) {
    return res.status(400).json({ error: "Pret invalid" });
  }

  if (!Number.isInteger(Number(durata_minute)) || Number(durata_minute) <= 0) {
    return res.status(400).json({ error: "Durata invalida" });
  }

  try {
    const result = await db.query(
      `
      UPDATE servicii
      SET
        denumire_serviciu = $1,
        pret = $2,
        durata_minute = $3
      WHERE id_serviciu = $4
      RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ
      `,
      [
        String(denumire_serviciu).trim(),
        Number(pret),
        Number(durata_minute),
        id_serviciu,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Serviciu inexistent" });
    }

    return res.json({
      message: "Serviciu actualizat",
      serviciu: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare PATCH /admin/servicii/:id_serviciu:", err);

    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Exista deja un serviciu cu aceasta denumire" });
    }

    return res.status(500).json({ error: "Eroare la actualizarea serviciului" });
  }
});

// 4.4) Dezactivează serviciu
router.patch("/admin/servicii/:id_serviciu/dezactiveaza", async (req, res) => {
  const id_serviciu = Number(req.params.id_serviciu);

  if (!Number.isInteger(id_serviciu)) {
    return res.status(400).json({ error: "id_serviciu invalid" });
  }

  try {
    const result = await db.query(
      `
      UPDATE servicii
      SET activ = false
      WHERE id_serviciu = $1
      RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ
      `,
      [id_serviciu]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Serviciu inexistent" });
    }

    return res.json({
      message: "Serviciu dezactivat",
      serviciu: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare PATCH /admin/servicii/:id_serviciu/dezactiveaza:", err);
    return res.status(500).json({ error: "Eroare la dezactivarea serviciului" });
  }
});

// 5) Căutare client după nume / prenume / telefon / email
router.get("/admin/clienti/search", async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.json([]);
  }

  const tokens = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return res.json([]);
  }

  try {
    const conditions = [];
    const values = [];

    tokens.forEach((token, index) => {
      const value = `%${token}%`;
      const base = index * 6;

      conditions.push(`
        (
          LOWER(COALESCE(c.nume, '')) LIKE LOWER($${base + 1})
          OR LOWER(COALESCE(c.prenume, '')) LIKE LOWER($${base + 2})
          OR LOWER(COALESCE(c.nume, '') || ' ' || COALESCE(c.prenume, '')) LIKE LOWER($${base + 3})
          OR LOWER(COALESCE(c.prenume, '') || ' ' || COALESCE(c.nume, '')) LIKE LOWER($${base + 4})
          OR LOWER(COALESCE(c.telefon, '')) LIKE LOWER($${base + 5})
          OR LOWER(COALESCE(ct.email, '')) LIKE LOWER($${base + 6})
        )
      `);

      values.push(value, value, value, value, value, value);
    });

    const query = `
      SELECT
        c.id_client,
        c.id_cont,
        c.nume,
        c.prenume,
        c.telefon,
        c.data_nasterii,
        ct.email
      FROM clienti c
      LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.nume ASC, c.prenume ASC
      LIMIT 10
    `;

    const result = await db.query(query, values);

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /admin/clienti/search:", err);
    return res.status(500).json({ error: "Eroare la cautarea clientilor" });
  }
});

 // 5.0) Lista tuturor clientilor
router.get("/admin/clienti", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        c.id_client,
        c.id_cont,
        c.nume,
        c.prenume,
        c.telefon,
        c.data_nasterii,
        ct.email
      FROM clienti c
      LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
      ORDER BY c.nume ASC, c.prenume ASC, c.id_client ASC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /admin/clienti:", err);
    return res.status(500).json({ error: "Eroare la preluarea clientilor" });
  }
});

// 5.1) Adaugă client nou fără cont online
router.post("/admin/clienti", async (req, res) => {
  const { nume, prenume, telefon, data_nasterii } = req.body;

  if (!nume || !prenume || !telefon || !data_nasterii) {
    return res.status(400).json({
      error: "Lipsesc campuri obligatorii: nume, prenume, telefon, data_nasterii",
    });
  }

  const numeCurat = String(nume).trim();
  const prenumeCurat = String(prenume).trim();
  const telefonCurat = String(telefon).trim();

  if (isFutureDateOnly(data_nasterii)) {
    return res.status(400).json({
      error: "Data nasterii nu poate fi in viitor",
    });
  }

  const clientDb = await db.pool.connect();

  try {
    await clientDb.query("BEGIN");

    const existsRes = await clientDb.query(
      `
      SELECT
        c.id_client,
        c.id_cont,
        c.nume,
        c.prenume,
        c.telefon,
        c.data_nasterii,
        ct.email
      FROM clienti c
      LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
      WHERE c.telefon = $1
      LIMIT 1
      `,
      [telefonCurat]
    );

    if (existsRes.rows.length > 0) {
      await clientDb.query("ROLLBACK");
      return res.status(409).json({
        error: "Exista deja un client cu acest telefon",
        client: existsRes.rows[0],
      });
    }

    const result = await clientDb.query(
      `
      INSERT INTO clienti (id_cont, nume, prenume, data_nasterii, telefon)
      VALUES (NULL, $1, $2, $3, $4)
      RETURNING
        id_client,
        id_cont,
        nume,
        prenume,
        telefon,
        data_nasterii
      `,
      [numeCurat, prenumeCurat, data_nasterii, telefonCurat]
    );

    await clientDb.query("COMMIT");

    return res.status(201).json({
      message: "Client adaugat cu succes",
      client: result.rows[0],
    });
  } catch (err) {
    try {
      await clientDb.query("ROLLBACK");
    } catch {}

    console.error("Eroare POST /admin/clienti:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Date duplicate pentru client",
      });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        error: "Date invalide pentru client",
      });
    }

    return res.status(500).json({ error: "Eroare la adaugarea clientului" });
  } finally {
    clientDb.release();
  }
});

 // 5.1.1) Editează client
router.patch("/admin/clienti/:id_client", async (req, res) => {
  const id_client = Number(req.params.id_client);
  const { nume, prenume, telefon, data_nasterii, email } = req.body;

  if (!Number.isInteger(id_client)) {
    return res.status(400).json({ error: "id_client invalid" });
  }

  if (!nume || !prenume || !telefon || !data_nasterii) {
    return res.status(400).json({
      error: "Lipsesc campuri obligatorii: nume, prenume, telefon, data_nasterii",
    });
  }

  if (isFutureDateOnly(data_nasterii)) {
    return res.status(400).json({
      error: "Data nasterii nu poate fi in viitor",
    });
  }

  const numeCurat = String(nume).trim();
  const prenumeCurat = String(prenume).trim();
  const telefonCurat = String(telefon).trim();
  const emailCurat = email ? String(email).trim().toLowerCase() : null;

  const clientDb = await db.pool.connect();

  try {
    await clientDb.query("BEGIN");

    const existingRes = await clientDb.query(
      `
      SELECT c.id_client, c.id_cont
      FROM clienti c
      WHERE c.id_client = $1
      LIMIT 1
      `,
      [id_client]
    );

    if (existingRes.rows.length === 0) {
      await clientDb.query("ROLLBACK");
      return res.status(404).json({ error: "Client inexistent" });
    }

    const existingClient = existingRes.rows[0];

    const phoneConflictRes = await clientDb.query(
      `
      SELECT id_client
      FROM clienti
      WHERE telefon = $1
        AND id_client <> $2
      LIMIT 1
      `,
      [telefonCurat, id_client]
    );

    if (phoneConflictRes.rows.length > 0) {
      await clientDb.query("ROLLBACK");
      return res.status(409).json({
        error: "Exista deja un alt client cu acest telefon",
      });
    }

    const updatedClientRes = await clientDb.query(
      `
      UPDATE clienti
      SET
        nume = $1,
        prenume = $2,
        telefon = $3,
        data_nasterii = $4
      WHERE id_client = $5
      RETURNING id_client, id_cont, nume, prenume, telefon, data_nasterii
      `,
      [numeCurat, prenumeCurat, telefonCurat, data_nasterii, id_client]
    );

    if (existingClient.id_cont && emailCurat !== null) {
      const emailConflictRes = await clientDb.query(
        `
        SELECT id_cont
        FROM conturi
        WHERE email = $1
          AND id_cont <> $2
        LIMIT 1
        `,
        [emailCurat, existingClient.id_cont]
      );

      if (emailConflictRes.rows.length > 0) {
        await clientDb.query("ROLLBACK");
        return res.status(409).json({
          error: "Exista deja un alt cont cu acest email",
        });
      }

      await clientDb.query(
        `
        UPDATE conturi
        SET email = $1
        WHERE id_cont = $2
        `,
        [emailCurat, existingClient.id_cont]
      );
    }

    const finalRes = await clientDb.query(
      `
      SELECT
        c.id_client,
        c.id_cont,
        c.nume,
        c.prenume,
        c.telefon,
        c.data_nasterii,
        ct.email
      FROM clienti c
      LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
      WHERE c.id_client = $1
      LIMIT 1
      `,
      [id_client]
    );

    await clientDb.query("COMMIT");

    return res.json({
      message: "Client actualizat cu succes",
      client: finalRes.rows[0],
    });
  } catch (err) {
    try {
      await clientDb.query("ROLLBACK");
    } catch {}

    console.error("Eroare PATCH /admin/clienti/:id_client:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Date duplicate pentru client",
      });
    }

    if (err.code === "23514") {
      return res.status(400).json({
        error: "Date invalide pentru client",
      });
    }

    return res.status(500).json({ error: "Eroare la actualizarea clientului" });
  } finally {
    clientDb.release();
  }
});

// 5.2) Sloturi disponibile pentru mai multe servicii consecutive
router.post("/admin/programari/sloturi-disponibile-multiple", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { data, segmente } = req.body;

  if (!data || !Array.isArray(segmente) || segmente.length === 0) {
    return res.status(400).json({
      error: "Lipsesc campuri obligatorii: data, segmente",
    });
  }

  const normalizedSegments = segmente.map((segment) => ({
    id_serviciu: Number(segment.id_serviciu),
    id_angajat: Number(segment.id_angajat),
  }));

  const invalidSegment = normalizedSegments.find(
    (segment) =>
      !Number.isInteger(segment.id_serviciu) ||
      !Number.isInteger(segment.id_angajat)
  );

  if (invalidSegment) {
    return res.status(400).json({
      error: "Fiecare segment trebuie să conțină id_serviciu și id_angajat valide",
    });
  }

  try {
    const slots = await getAvailableSlotsForSegments({
      id_locatie,
      data,
      segmente: normalizedSegments,
    });

    return res.json(slots);
  } catch (err) {
    console.error("Eroare POST /admin/programari/sloturi-disponibile-multiple:", err);
    return res.status(500).json({
      error: err.message || "Eroare la generarea sloturilor pentru segmente multiple",
    });
  }
});

// 6) Adăugare programare manuală din admin
router.post("/admin/programari/manual", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { id_client, observatii, segmente, id_serviciu, id_angajat, data_start } = req.body;

  if (!id_client) {
    return res.status(400).json({
      error: "Lipseste id_client",
    });
  }

  if (!Number.isInteger(Number(id_client))) {
    return res.status(400).json({
      error: "id_client trebuie sa fie numar intreg",
    });
  }

  let normalizedSegments = [];

  if (Array.isArray(segmente) && segmente.length > 0) {
    normalizedSegments = segmente.map((segment) => ({
      id_serviciu: Number(segment.id_serviciu),
      id_angajat: Number(segment.id_angajat),
      data_start: segment.data_start,
    }));
  } else if (id_serviciu && id_angajat && data_start) {
    normalizedSegments = [
      {
        id_serviciu: Number(id_serviciu),
        id_angajat: Number(id_angajat),
        data_start,
      },
    ];
  } else {
    return res.status(400).json({
      error:
        "Lipsesc datele programarii. Trimite segmente sau id_serviciu, id_angajat, data_start",
    });
  }

  if (normalizedSegments.length === 0) {
    return res.status(400).json({
      error: "Programarea trebuie sa contina cel putin un segment",
    });
  }

  for (const segment of normalizedSegments) {
    if (
      !Number.isInteger(Number(segment.id_serviciu)) ||
      !Number.isInteger(Number(segment.id_angajat)) ||
      !segment.data_start
    ) {
      return res.status(400).json({
        error:
          "Fiecare segment trebuie sa contina id_serviciu, id_angajat si data_start valide",
      });
    }
  }

  try {
    const clientRes = await db.query(
      `
      SELECT
        c.id_client,
        c.nume,
        c.prenume,
        c.telefon,
        c.data_nasterii,
        ct.email
      FROM clienti c
      LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
      WHERE c.id_client = $1
      LIMIT 1
      `,
      [Number(id_client)]
    );

    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: "Client inexistent" });
    }

    const bookingResult = await createBooking({
      id_client: Number(id_client),
      id_locatie,
      observatii: observatii ? String(observatii).trim() : null,
      segmente: normalizedSegments,
    });

    const detailsRes = await db.query(
      `
      SELECT
        p.id_programare,
        p.id_client,
        p.id_locatie,
        p.status,
        p.observatii,
        p.data_creare,

        ps.id_programare_serviciu,
        ps.id_serviciu,
        ps.id_angajat,
        ps.data_start,
        ps.data_final,

        s.denumire_serviciu,
        s.durata_minute,
        s.pret,

        a.nume AS nume_angajat,
        a.prenume AS prenume_angajat
      FROM programari p
      JOIN programare_servicii ps ON ps.id_programare = p.id_programare
      JOIN servicii s ON s.id_serviciu = ps.id_serviciu
      JOIN angajati a ON a.id_angajat = ps.id_angajat
      WHERE p.id_programare = $1
      ORDER BY ps.data_start ASC, ps.id_programare_serviciu ASC
      `,
      [bookingResult.id_programare]
    );

    const programare = detailsRes.rows[0]
      ? {
          id_programare: detailsRes.rows[0].id_programare,
          id_client: detailsRes.rows[0].id_client,
          id_locatie: detailsRes.rows[0].id_locatie,
          status: detailsRes.rows[0].status,
          observatii: detailsRes.rows[0].observatii,
          data_creare: detailsRes.rows[0].data_creare,
        }
      : null;

    const segmenteCreate = detailsRes.rows.map((row) => ({
      id_programare_serviciu: row.id_programare_serviciu,
      id_serviciu: row.id_serviciu,
      id_angajat: row.id_angajat,
      data_start: row.data_start,
      data_final: row.data_final,
      denumire_serviciu: row.denumire_serviciu,
      durata_minute: row.durata_minute,
      pret: row.pret,
      angajat: {
        nume: row.nume_angajat,
        prenume: row.prenume_angajat,
      },
    }));

    return res.status(201).json({
      message:
        segmenteCreate.length > 1
          ? "Programare multipla adaugata manual cu succes"
          : "Programare adaugata manual cu succes",
      programare,
      client: clientRes.rows[0],
      segmente: segmenteCreate,
    });
  } catch (err) {
    console.error("Eroare POST /admin/programari/manual:", err.message);
    return res.status(500).json({
      error: err.message || "Eroare la adaugarea programarii manuale",
    });
  }
});

// 7) Lista programări din salonul adminului
router.get("/admin/programari", async (req, res) => {
  const id_locatie = req.user.id_locatie;

  try {
    const result = await db.query(
      `
      SELECT
        p.id_programare,
        p.id_locatie,
        p.status,
        p.observatii,
        p.data_creare,
        l.denumire AS denumire_locatie,

        c.id_client,
        c.nume AS nume_client,
        c.prenume AS prenume_client,
        c.telefon AS telefon_client,

        ps.id_programare_serviciu,
        ps.data_start,
        ps.data_final,

        s.id_serviciu,
        s.denumire_serviciu,
        s.durata_minute,
        s.pret,

        a.id_angajat,
        a.nume AS nume_angajat,
        a.prenume AS prenume_angajat,

        ch.nr_chitanta,
        CASE WHEN ch.nr_chitanta IS NOT NULL THEN true ELSE false END AS are_chitanta
      FROM programare_servicii ps
      JOIN programari p ON p.id_programare = ps.id_programare
      JOIN clienti c ON c.id_client = p.id_client
      JOIN locatii l ON l.id_locatie = p.id_locatie
      JOIN servicii s ON s.id_serviciu = ps.id_serviciu
      JOIN angajati a ON a.id_angajat = ps.id_angajat
      LEFT JOIN chitante ch ON ch.id_programare = p.id_programare
      WHERE p.id_locatie = $1
      ORDER BY ps.data_start DESC, ps.id_programare DESC, ps.id_programare_serviciu DESC
      `,
      [id_locatie]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea programarilor" });
  }
});

// 7.1) Anulează programare din admin
router.patch("/admin/programari/:id_programare/anulare", async (req, res) => {
  const id_programare = Number(req.params.id_programare);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_programare)) {
    return res.status(400).json({ error: "id_programare invalid" });
  }

  try {
    const checkRes = await db.query(
      `
      SELECT id_programare, status
      FROM programari
      WHERE id_programare = $1
        AND id_locatie = $2
      LIMIT 1
      `,
      [id_programare, id_locatie]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        error: "Programare inexistenta sau fara acces",
      });
    }

    const status = checkRes.rows[0].status;

    if (status === "Anulata") {
      return res.status(400).json({
        error: "Programarea este deja anulata",
      });
    }

    const chitantaRes = await db.query(
      `
      SELECT nr_chitanta
      FROM chitante
      WHERE id_programare = $1
      LIMIT 1
      `,
      [id_programare]
    );

    if (chitantaRes.rows.length > 0) {
      return res.status(409).json({
        error: "Nu poti anula o programare pentru care a fost deja emisa chitanta",
      });
    }

    await db.query(
      `
      UPDATE programari
      SET status = 'Anulata'
      WHERE id_programare = $1
        AND id_locatie = $2
      `,
      [id_programare, id_locatie]
    );

    return res.json({
      message: "Programare anulata",
      id_programare,
    });
  } catch (err) {
    console.error("Eroare PATCH /admin/programari/:id_programare/anulare:", err);
    return res.status(500).json({ error: "Eroare la anularea programarii" });
  }
});

// 8) Lista stocuri din salonul adminului
router.get("/admin/stocuri", async (req, res) => {
  const id_locatie = req.user.id_locatie;

  try {
    const result = await db.query(
      `
      SELECT
        s.id_stoc,
        s.id_locatie,
        s.id_produs,
        s.cantitate,
        p.denumire_produs,
        p.unitate_masura,
        p.activ
      FROM stocuri s
      JOIN produse p ON p.id_produs = s.id_produs
      WHERE s.id_locatie = $1
      ORDER BY p.denumire_produs ASC
      `,
      [id_locatie]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea stocurilor" });
  }
});

// 9) Adaugă produs nou + stoc pentru locația adminului
router.post("/admin/produse", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { denumire_produs, unitate_masura, cantitate } = req.body;

  if (!denumire_produs || !unitate_masura || cantitate === undefined) {
    return res.status(400).json({
      error: "Lipsesc campuri: denumire_produs, unitate_masura, cantitate",
    });
  }

  if (!Number.isFinite(Number(cantitate)) || Number(cantitate) < 0) {
    return res.status(400).json({ error: "Cantitate invalida" });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const produsRes = await client.query(
      `
      INSERT INTO produse (denumire_produs, unitate_masura, activ)
      VALUES ($1, $2, true)
      RETURNING id_produs, denumire_produs, unitate_masura, activ
      `,
      [String(denumire_produs).trim(), String(unitate_masura).trim()]
    );

    const produs = produsRes.rows[0];

    const stocRes = await client.query(
      `
      INSERT INTO stocuri (id_locatie, id_produs, cantitate)
      VALUES ($1, $2, $3)
      RETURNING id_stoc, id_locatie, id_produs, cantitate
      `,
      [id_locatie, produs.id_produs, Number(cantitate)]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Produs adaugat cu succes",
      produs,
      stoc: stocRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Eroare la adaugarea produsului" });
  } finally {
    client.release();
  }
});

// 10) Editare stoc din locația adminului
router.patch("/admin/stocuri/:id_stoc", async (req, res) => {
  const id_stoc = Number(req.params.id_stoc);
  const id_locatie = req.user.id_locatie;
  const { cantitate } = req.body;

  if (!Number.isInteger(id_stoc)) {
    return res.status(400).json({ error: "id_stoc invalid" });
  }

  if (!Number.isFinite(Number(cantitate)) || Number(cantitate) < 0) {
    return res.status(400).json({ error: "Cantitate invalida" });
  }

  try {
    const result = await db.query(
      `
      UPDATE stocuri
      SET cantitate = $1
      WHERE id_stoc = $2
        AND id_locatie = $3
      RETURNING id_stoc, id_locatie, id_produs, cantitate
      `,
      [Number(cantitate), id_stoc, id_locatie]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stoc inexistent sau fara acces" });
    }

    return res.json({
      message: "Stoc actualizat",
      stoc: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la actualizarea stocului" });
  }
});

// 11) Dezactivare produs existent în locația adminului
router.patch("/admin/produse/:id_produs/dezactiveaza", async (req, res) => {
  const id_produs = Number(req.params.id_produs);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_produs)) {
    return res.status(400).json({ error: "id_produs invalid" });
  }

  try {
    const checkRes = await db.query(
      `
      SELECT 1
      FROM stocuri
      WHERE id_produs = $1
        AND id_locatie = $2
      LIMIT 1
      `,
      [id_produs, id_locatie]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Produs inexistent in locatia ta" });
    }

    const result = await db.query(
      `
      UPDATE produse
      SET activ = false
      WHERE id_produs = $1
      RETURNING id_produs, denumire_produs, unitate_masura, activ
      `,
      [id_produs]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produs inexistent" });
    }

    return res.json({
      message: "Produs dezactivat",
      produs: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la dezactivarea produsului" });
  }
});

// 12) Listează indisponibilitățile unui angajat din salonul adminului
router.get("/admin/angajati/:id_angajat/indisponibilitati", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_angajat)) {
    return res.status(400).json({ error: "id_angajat invalid" });
  }

  try {
    const checkRes = await db.query(
      `
      SELECT 1
      FROM angajati
      WHERE id_angajat = $1
        AND id_locatie = $2
      LIMIT 1
      `,
      [id_angajat, id_locatie]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Angajat inexistent in locatia ta" });
    }

    const result = await db.query(
      `
      SELECT
        ia.id_indisponibilitate,
        ia.id_angajat,
        ia.data_start,
        ia.data_final,
        ia.tip,
        ia.motiv,
        ia.creata_la
      FROM indisponibilitati_angajati ia
      JOIN angajati a ON a.id_angajat = ia.id_angajat
      WHERE ia.id_angajat = $1
        AND a.id_locatie = $2
      ORDER BY ia.data_start ASC
      `,
      [id_angajat, id_locatie]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea indisponibilitatilor" });
  }
});

// 13) Adaugă indisponibilitate doar pentru angajații din salonul adminului
router.post("/admin/indisponibilitati", async (req, res) => {
  const { id_angajat, data_start, data_final, tip, motiv } = req.body;
  const id_locatie = req.user.id_locatie;

  if (!id_angajat || !data_start || !data_final || !tip) {
    return res.status(400).json({
      error:
        "Lipsesc campuri obligatorii: id_angajat, data_start, data_final, tip",
    });
  }

  const allowedTypes = ["concediu", "medical", "urgenta"];
  if (!allowedTypes.includes(tip)) {
    return res.status(400).json({
      error: "Tip invalid. Valorile permise sunt: concediu, medical, urgenta",
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const empRes = await client.query(
      `
      SELECT id_angajat, activ, id_locatie
      FROM angajati
      WHERE id_angajat = $1
      `,
      [id_angajat]
    );

    if (empRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Angajat inexistent" });
    }

    if (Number(empRes.rows[0].id_locatie) !== Number(id_locatie)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Nu ai acces la acest angajat" });
    }

    if (empRes.rows[0].activ === false) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Angajat inactiv" });
    }

    const intervalRes = await client.query(
      `
      SELECT ($1::timestamp < $2::timestamp) AS interval_valid
      `,
      [data_start, data_final]
    );

    if (!intervalRes.rows[0].interval_valid) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error:
          "Interval invalid: data_start trebuie sa fie inainte de data_final",
      });
    }

    const overlap = await hasUnavailabilityOverlap(
      client,
      id_angajat,
      id_locatie,
      data_start,
      data_final
    );

    if (overlap) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Exista deja o indisponibilitate suprapusa pentru acest angajat",
      });
    }

    const affectedAppointments = await getAffectedAppointments(
      client,
      id_angajat,
      id_locatie,
      data_start,
      data_final
    );

    if (tip === "concediu" && affectedAppointments.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error:
          "Concediul nu poate fi introdus deoarece exista programari in intervalul selectat",
        affectedAppointments,
      });
    }

    const insRes = await client.query(
      `
      INSERT INTO indisponibilitati_angajati
        (id_angajat, data_start, data_final, tip, motiv)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id_indisponibilitate,
        id_angajat,
        data_start,
        data_final,
        tip,
        motiv,
        creata_la
      `,
      [id_angajat, data_start, data_final, tip, motiv || null]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message:
        tip === "concediu"
          ? "Indisponibilitate de tip concediu adaugata"
          : "Indisponibilitate adaugata. Programarile afectate trebuie gestionate manual.",
      indisponibilitate: insRes.rows[0],
      affectedAppointments,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Eroare la adaugarea indisponibilitatii" });
  } finally {
    client.release();
  }
});

// 14) Șterge indisponibilitate doar din salonul adminului
router.delete("/admin/indisponibilitati/:id", async (req, res) => {
  const id = Number(req.params.id);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id invalid" });
  }

  try {
    const result = await db.query(
      `
      DELETE FROM indisponibilitati_angajati ia
      USING angajati a
      WHERE ia.id_indisponibilitate = $1
        AND a.id_angajat = ia.id_angajat
        AND a.id_locatie = $2
      RETURNING ia.id_indisponibilitate, ia.id_angajat, ia.data_start, ia.data_final, ia.tip
      `,
      [id, id_locatie]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Indisponibilitate inexistenta sau fara acces" });
    }

    return res.json({
      message: "Indisponibilitate stearsa",
      indisponibilitate: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la stergerea indisponibilitatii" });
  }
});

// 15) Finalizează programare doar din salonul adminului
router.patch("/admin/programari/:id_programare/finalizeaza", async (req, res) => {
  const id_programare = Number(req.params.id_programare);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_programare)) {
    return res.status(400).json({ error: "id_programare invalid" });
  }

  try {
    const checkRes = await db.query(
      `
      SELECT id_programare, status
      FROM programari
      WHERE id_programare = $1
        AND id_locatie = $2
      LIMIT 1
      `,
      [id_programare, id_locatie]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Programare inexistenta sau fara acces" });
    }

    const status = checkRes.rows[0].status;

    if (status === "Anulata") {
      return res.status(409).json({ error: "Nu poti finaliza o programare anulata" });
    }

    if (status === "Finalizata") {
      return res.status(409).json({ error: "Programarea este deja finalizata" });
    }

    const result = await db.query(
      `
      UPDATE programari
      SET status = 'Finalizata'
      WHERE id_programare = $1
        AND id_locatie = $2
      RETURNING id_programare, status, id_locatie
      `,
      [id_programare, id_locatie]
    );

    return res.json({
      message: "Programare finalizata",
      programare: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la finalizarea programarii" });
  }
});

// 16) Emite chitanță doar pentru programări din salonul adminului
router.post("/admin/chitante", async (req, res) => {
  const { id_programare } = req.body;
  const id_locatie = req.user.id_locatie;

  if (!id_programare) {
    return res.status(400).json({ error: "Lipseste id_programare" });
  }

  try {
    const progRes = await db.query(
      `
      SELECT id_programare, status, id_locatie
      FROM programari
      WHERE id_programare = $1
        AND id_locatie = $2
      LIMIT 1
      `,
      [id_programare, id_locatie]
    );

    if (progRes.rows.length === 0) {
      return res.status(404).json({
        error: "Programare inexistenta sau fara acces",
      });
    }

    if (progRes.rows[0].status !== "Finalizata") {
      return res.status(409).json({
        error: "Programarea nu este finalizata",
      });
    }

    const existingReceiptRes = await db.query(
      `
      SELECT nr_chitanta
      FROM chitante
      WHERE id_programare = $1
      LIMIT 1
      `,
      [id_programare]
    );

    if (existingReceiptRes.rows.length > 0) {
      return res.status(409).json({
        error: "Exista deja chitanta pentru aceasta programare",
      });
    }

    const sumRes = await db.query(
      `
      SELECT COALESCE(SUM(s.pret), 0) AS suma_totala
      FROM programare_servicii ps
      JOIN servicii s ON s.id_serviciu = ps.id_serviciu
      JOIN programari p ON p.id_programare = ps.id_programare
      WHERE ps.id_programare = $1
        AND p.id_locatie = $2
      `,
      [id_programare, id_locatie]
    );

    const suma_totala = Number(sumRes.rows[0].suma_totala);

    const chitRes = await db.query(
      `
      INSERT INTO chitante (id_programare, suma_totala)
      VALUES ($1, $2)
      RETURNING nr_chitanta, id_programare, suma_totala, data_emitere
      `,
      [id_programare, suma_totala]
    );

    return res.status(201).json({
      message: "Chitanta emisa",
      chitanta: chitRes.rows[0],
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Exista deja chitanta pentru aceasta programare",
      });
    }

    return res.status(500).json({ error: "Eroare la emiterea chitantei" });
  }
});

// 16.1) Listează chitanțele emise și neplătite din salonul adminului
router.get("/admin/chitante/disponibile-plata", async (req, res) => {
  const id_locatie = req.user.id_locatie;

  try {
    const result = await db.query(
      `
      SELECT
        ch.nr_chitanta,
        ch.id_programare,
        ch.suma_totala,
        ch.data_emitere,
        c.id_client,
        c.nume AS nume_client,
        c.prenume AS prenume_client
      FROM chitante ch
      JOIN programari p ON p.id_programare = ch.id_programare
      JOIN clienti c ON c.id_client = p.id_client
      LEFT JOIN plati pl ON pl.nr_chitanta = ch.nr_chitanta
      WHERE p.id_locatie = $1
        AND pl.id_plata IS NULL
      ORDER BY ch.data_emitere DESC, ch.nr_chitanta DESC
      `,
      [id_locatie]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /admin/chitante/disponibile-plata:", err);
    return res.status(500).json({
      error: "Eroare la preluarea chitantelor disponibile",
    });
  }
});

// 16.2) Istoricul tuturor chitanțelor emise din salonul adminului
router.get("/admin/chitante/istoric", async (req, res) => {
  const id_locatie = req.user.id_locatie;

  try {
    const result = await db.query(
      `
      SELECT
        ch.nr_chitanta,
        ch.id_programare,
        ch.suma_totala,
        ch.data_emitere,
        c.id_client,
        c.nume AS nume_client,
        c.prenume AS prenume_client,
        c.telefon AS telefon_client,
        pl.id_plata,
        pl.tip_plata,
        pl.status_plata,
        pl.data_plata
      FROM chitante ch
      JOIN programari p ON p.id_programare = ch.id_programare
      JOIN clienti c ON c.id_client = p.id_client
      LEFT JOIN plati pl ON pl.nr_chitanta = ch.nr_chitanta
      WHERE p.id_locatie = $1
      ORDER BY ch.data_emitere DESC, ch.nr_chitanta DESC
      `,
      [id_locatie]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /admin/chitante/istoric:", err);
    return res.status(500).json({
      error: "Eroare la preluarea istoricului chitantelor",
    });
  }
});

// 17) Înregistrează plată doar pentru chitanțe din salonul adminului
router.post("/admin/plati", async (req, res) => {
  const { nr_chitanta, tip_plata } = req.body;
  const id_locatie = req.user.id_locatie;

  if (!nr_chitanta) {
    return res.status(400).json({ error: "Lipseste nr_chitanta" });
  }

  const tip = tip_plata || "Card";

  try {
    const chitRes = await db.query(
      `
      SELECT ch.nr_chitanta
      FROM chitante ch
      JOIN programari p ON p.id_programare = ch.id_programare
      WHERE ch.nr_chitanta = $1
        AND p.id_locatie = $2
      LIMIT 1
      `,
      [nr_chitanta, id_locatie]
    );

    if (chitRes.rows.length === 0) {
      return res.status(404).json({
        error: "Chitanta inexistenta sau fara acces",
      });
    }

    const existingPaymentRes = await db.query(
      `
      SELECT id_plata
      FROM plati
      WHERE nr_chitanta = $1
      LIMIT 1
      `,
      [nr_chitanta]
    );

    if (existingPaymentRes.rows.length > 0) {
      return res.status(409).json({
        error: "Exista deja o plata inregistrata pentru aceasta chitanta",
      });
    }

    const plataRes = await db.query(
      `
      INSERT INTO plati (nr_chitanta, tip_plata, status_plata)
      VALUES ($1, $2, 'Finalizata')
      RETURNING id_plata, nr_chitanta, tip_plata, status_plata, data_plata
      `,
      [nr_chitanta, tip]
    );

    return res.status(201).json({
      message: "Plata inregistrata",
      plata: plataRes.rows[0],
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Exista deja o plata inregistrata pentru aceasta chitanta",
      });
    }

    return res.status(500).json({ error: "Eroare la inregistrarea platii" });
  }
});

module.exports = router;