const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");
const { createBooking } = require("../services/booking.service");

const router = express.Router();

// ======================
// GET profiluri (toate persoanele din cont)
// ======================
router.get("/client/profiles", requireAuth, async (req, res) => {
  try {
    const id_cont = req.user.id_cont;

    const result = await db.query(
      `
      SELECT
        id_client,
        nume,
        prenume,
        data_nasterii,
        telefon
      FROM clienti
      WHERE id_cont = $1
      ORDER BY id_client ASC
      `,
      [id_cont]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /client/profiles:", err);
    return res.status(500).json({ error: "Eroare la încărcare profiluri" });
  }
});

// ======================
// CREATE profil nou
// ======================
router.post("/client/profiles", requireAuth, async (req, res) => {
  const { nume, prenume, data_nasterii } = req.body;

  if (!nume || !prenume || !data_nasterii) {
    return res.status(400).json({
      error: "Lipsesc câmpuri: nume, prenume, data_nasterii",
    });
  }

  try {
    const id_cont = req.user.id_cont;

    const telRes = await db.query(
      `
      SELECT telefon
      FROM conturi
      WHERE id_cont = $1
      LIMIT 1
      `,
      [id_cont]
    );

    if (telRes.rows.length === 0) {
      return res.status(404).json({ error: "Cont inexistent" });
    }

    const telefon = telRes.rows[0].telefon;

    const profilRes = await db.query(
      `
      INSERT INTO clienti (id_cont, nume, prenume, data_nasterii, telefon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_client, nume, prenume, data_nasterii, telefon
      `,
      [id_cont, String(nume).trim(), String(prenume).trim(), data_nasterii, telefon]
    );

    return res.status(201).json(profilRes.rows[0]);
  } catch (err) {
    console.error("Eroare POST /client/profiles:", err);

    if (err.code === "23514") {
      return res.status(400).json({ error: "Date invalide pentru profil" });
    }

    return res.status(500).json({ error: "Eroare la creare profil" });
  }
});

// ======================
// GET programări client
// 1 rând = 1 segment din programare
// ======================
router.get("/client/programari", requireAuth, async (req, res) => {
  try {
    const id_cont = req.user.id_cont;

    const result = await db.query(
      `
      SELECT
        p.id_programare,
        p.status,
        p.observatii,
        p.data_creare,
        l.denumire AS denumire_locatie,

        c.id_client,
        c.nume AS nume_client,
        c.prenume AS prenume_client,

        ps.id_programare_serviciu,
        ps.data_start,
        ps.data_final,

        s.id_serviciu,
        s.denumire_serviciu,
        s.durata_minute,
        s.pret,

        a.id_angajat,
        a.nume AS nume_angajat,
        a.prenume AS prenume_angajat
      FROM programare_servicii ps
      JOIN programari p ON p.id_programare = ps.id_programare
      JOIN clienti c ON c.id_client = p.id_client
      JOIN locatii l ON l.id_locatie = p.id_locatie
      JOIN servicii s ON s.id_serviciu = ps.id_serviciu
      JOIN angajati a ON a.id_angajat = ps.id_angajat
      WHERE c.id_cont = $1
      ORDER BY ps.data_start DESC, ps.id_programare_serviciu DESC
      `,
      [id_cont]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /client/programari:", err);
    return res.status(500).json({ error: "Eroare la încărcare programări" });
  }
});

// ======================
// POST programări (creare)
// suportă mai multe segmente
// ======================
router.post("/client/programari", requireAuth, async (req, res) => {
  const { id_client, id_locatie, observatii, segmente } = req.body;

  if (!id_client || !id_locatie || !Array.isArray(segmente) || segmente.length === 0) {
    return res.status(400).json({
      error: "Lipsesc câmpuri: id_client, id_locatie, segmente[]",
    });
  }

  if (!Number.isInteger(Number(id_client)) || !Number.isInteger(Number(id_locatie))) {
    return res.status(400).json({
      error: "id_client și id_locatie trebuie să fie numere întregi",
    });
  }

  for (const segment of segmente) {
    if (
      !segment ||
      !Number.isInteger(Number(segment.id_serviciu)) ||
      !Number.isInteger(Number(segment.id_angajat)) ||
      !segment.data_start
    ) {
      return res.status(400).json({
        error:
          "Fiecare segment trebuie să conțină id_serviciu, id_angajat și data_start valide",
      });
    }
  }

  try {
    const check = await db.query(
      `
      SELECT 1
      FROM clienti
      WHERE id_client = $1
        AND id_cont = $2
      LIMIT 1
      `,
      [Number(id_client), req.user.id_cont]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Nu ai acces la acest profil" });
    }

    const normalizedSegments = segmente.map((segment) => ({
      id_serviciu: Number(segment.id_serviciu),
      id_angajat: Number(segment.id_angajat),
      data_start: segment.data_start,
    }));

    const result = await createBooking({
      id_client: Number(id_client),
      id_locatie: Number(id_locatie),
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
      [result.id_programare]
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
          ? "Programare multiplă creată cu succes"
          : "Programare creată cu succes",
      programare,
      segmente: segmenteCreate,
    });
  } catch (err) {
    console.error("Eroare POST /client/programari:", err);

    const msg = String(err.message || "");

    if (
      msg.includes("Segmente lipsă") ||
      msg.includes("Segment invalid") ||
      msg.includes("Locație invalidă") ||
      msg.includes("Locație inactivă") ||
      msg.includes("Serviciu invalid") ||
      msg.includes("Durată invalidă") ||
      msg.includes("Angajat invalid") ||
      msg.includes("nu aparține locației selectate") ||
      msg.includes("nu poate executa serviciul") ||
      msg.includes("Nu poți face o programare în trecut") ||
      msg.includes("Programarea se poate face doar în luna curentă și luna următoare") ||
      msg.includes("Programarea trebuie să fie în programul locației") ||
      msg.includes("Toate serviciile din aceeași programare trebuie să fie în aceeași zi") ||
      msg.includes("Serviciile trebuie să fie consecutive") ||
      msg.includes("Clientul are deja o altă programare care se suprapune")
    ) {
      return res.status(400).json({ error: msg });
    }

    if (
      msg.includes("nu este disponibil") ||
      msg.includes("nu lucrează în ziua selectată") ||
      msg.includes("este inactiv")
    ) {
      return res.status(409).json({ error: msg });
    }

    return res.status(500).json({
      error: "Eroare la creare programare",
    });
  }
});

// ======================
// CANCEL programare (client)
// ======================
router.patch("/client/programari/:id_programare/anulare", requireAuth, async (req, res) => {
  try {
    const id_cont = req.user.id_cont;
    const id_programare = Number(req.params.id_programare);

    if (!Number.isInteger(id_programare)) {
      return res.status(400).json({ error: "ID programare invalid" });
    }

    const checkRes = await db.query(
      `
      SELECT p.status
      FROM programari p
      JOIN clienti c ON c.id_client = p.id_client
      WHERE p.id_programare = $1
        AND c.id_cont = $2
      LIMIT 1
      `,
      [id_programare, id_cont]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        error: "Programare inexistentă sau nu ai acces",
      });
    }

    const status = checkRes.rows[0].status;

    if (status === "Finalizata" || status === "Anulata") {
      return res.status(400).json({
        error: `Nu poți anula o programare cu status: ${status}`,
      });
    }

    const pastRes = await db.query(
      `
      SELECT 1
      FROM programare_servicii ps
      WHERE ps.id_programare = $1
        AND ps.data_start < now()
      LIMIT 1
      `,
      [id_programare]
    );

    if (pastRes.rows.length > 0) {
      return res.status(400).json({
        error: "Nu poți anula o programare care a început deja",
      });
    }

    await db.query(
      `
      UPDATE programari
      SET status = 'Anulata'
      WHERE id_programare = $1
      `,
      [id_programare]
    );

    return res.json({ message: "Programare anulată" });
  } catch (err) {
    console.error("Eroare PATCH /client/programari/:id_programare/anulare:", err);
    return res.status(500).json({ error: "Eroare la anulare programare" });
  }
});

module.exports = router;