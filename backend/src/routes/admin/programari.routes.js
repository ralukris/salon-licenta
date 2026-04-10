const express = require("express");
const db = require("../../config/db");
const { createBooking, getAvailableSlotsForSegments } = require("../../services/booking.service");

const router = express.Router();

// 1) Lista programări
router.get("/", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  try {
    const result = await db.query(
      `SELECT
        p.id_programare, p.id_locatie, p.status, p.observatii, p.data_creare,
        l.denumire AS denumire_locatie,
        c.id_client, c.nume AS nume_client, c.prenume AS prenume_client, c.telefon AS telefon_client,
        ps.id_programare_serviciu, ps.data_start, ps.data_final,
        s.id_serviciu, s.denumire_serviciu, s.durata_minute, s.pret,
        a.id_angajat, a.nume AS nume_angajat, a.prenume AS prenume_angajat,
        ch.nr_chitanta,
        CASE WHEN ch.nr_chitanta IS NOT NULL THEN true ELSE false END AS are_chitanta
       FROM programare_servicii ps
       JOIN programari p ON p.id_programare = ps.id_programare
       JOIN clienti c ON c.id_client = p.id_client
       JOIN locatii l ON l.id_locatie = p.id_locatie
       JOIN servicii s ON s.id_serviciu = ps.id_serviciu
       JOIN angajati a ON a.id_angajat = ps.id_angajat
       LEFT JOIN chitante ch ON ch.id_programare = p.id_programare
       WHERE p.id_locatie=$1
       ORDER BY ps.data_start DESC, ps.id_programare DESC, ps.id_programare_serviciu DESC`,
      [id_locatie]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea programarilor" });
  }
});

// 2) Sloturi disponibile multiple
router.post("/sloturi-disponibile-multiple", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { data, segmente } = req.body;

  if (!data || !Array.isArray(segmente) || segmente.length === 0) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii: data, segmente" });
  }

  const normalizedSegments = segmente.map((s) => ({
    id_serviciu: Number(s.id_serviciu),
    id_angajat: Number(s.id_angajat),
  }));

  const invalidSegment = normalizedSegments.find(
    (s) => !Number.isInteger(s.id_serviciu) || !Number.isInteger(s.id_angajat)
  );
  if (invalidSegment) {
    return res.status(400).json({ error: "Fiecare segment trebuie să conțină id_serviciu și id_angajat valide" });
  }

  try {
    const slots = await getAvailableSlotsForSegments({ id_locatie, data, segmente: normalizedSegments });
    return res.json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Eroare la generarea sloturilor" });
  }
});

// 3) Adăugare programare manuală
router.post("/manual", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { id_client, observatii, segmente, id_serviciu, id_angajat, data_start } = req.body;

  if (!id_client) return res.status(400).json({ error: "Lipseste id_client" });
  if (!Number.isInteger(Number(id_client))) return res.status(400).json({ error: "id_client trebuie sa fie numar intreg" });

  let normalizedSegments = [];
  if (Array.isArray(segmente) && segmente.length > 0) {
    normalizedSegments = segmente.map((s) => ({
      id_serviciu: Number(s.id_serviciu),
      id_angajat: Number(s.id_angajat),
      data_start: s.data_start,
    }));
  } else if (id_serviciu && id_angajat && data_start) {
    normalizedSegments = [{ id_serviciu: Number(id_serviciu), id_angajat: Number(id_angajat), data_start }];
  } else {
    return res.status(400).json({ error: "Lipsesc datele programarii." });
  }

  for (const segment of normalizedSegments) {
    if (!Number.isInteger(Number(segment.id_serviciu)) || !Number.isInteger(Number(segment.id_angajat)) || !segment.data_start) {
      return res.status(400).json({ error: "Fiecare segment trebuie sa contina id_serviciu, id_angajat si data_start valide" });
    }
  }

  try {
    const clientRes = await db.query(
      `SELECT c.id_client, c.nume, c.prenume, c.telefon, c.data_nasterii, ct.email
       FROM clienti c LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
       WHERE c.id_client=$1 LIMIT 1`,
      [Number(id_client)]
    );
    if (clientRes.rows.length === 0) return res.status(404).json({ error: "Client inexistent" });

    const bookingResult = await createBooking({
      id_client: Number(id_client),
      id_locatie,
      observatii: observatii ? String(observatii).trim() : null,
      segmente: normalizedSegments,
    });

    const detailsRes = await db.query(
      `SELECT p.id_programare, p.id_client, p.id_locatie, p.status, p.observatii, p.data_creare,
        ps.id_programare_serviciu, ps.id_serviciu, ps.id_angajat, ps.data_start, ps.data_final,
        s.denumire_serviciu, s.durata_minute, s.pret,
        a.nume AS nume_angajat, a.prenume AS prenume_angajat
       FROM programari p
       JOIN programare_servicii ps ON ps.id_programare = p.id_programare
       JOIN servicii s ON s.id_serviciu = ps.id_serviciu
       JOIN angajati a ON a.id_angajat = ps.id_angajat
       WHERE p.id_programare=$1
       ORDER BY ps.data_start ASC, ps.id_programare_serviciu ASC`,
      [bookingResult.id_programare]
    );

    const programare = detailsRes.rows[0] ? {
      id_programare: detailsRes.rows[0].id_programare,
      id_client: detailsRes.rows[0].id_client,
      id_locatie: detailsRes.rows[0].id_locatie,
      status: detailsRes.rows[0].status,
      observatii: detailsRes.rows[0].observatii,
      data_creare: detailsRes.rows[0].data_creare,
    } : null;

    const segmenteCreate = detailsRes.rows.map((row) => ({
      id_programare_serviciu: row.id_programare_serviciu,
      id_serviciu: row.id_serviciu,
      id_angajat: row.id_angajat,
      data_start: row.data_start,
      data_final: row.data_final,
      denumire_serviciu: row.denumire_serviciu,
      durata_minute: row.durata_minute,
      pret: row.pret,
      angajat: { nume: row.nume_angajat, prenume: row.prenume_angajat },
    }));

    return res.status(201).json({
      message: segmenteCreate.length > 1 ? "Programare multipla adaugata manual cu succes" : "Programare adaugata manual cu succes",
      programare,
      client: clientRes.rows[0],
      segmente: segmenteCreate,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Eroare la adaugarea programarii manuale" });
  }
});

// 4) Anulează programare
router.patch("/:id_programare/anulare", async (req, res) => {
  const id_programare = Number(req.params.id_programare);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_programare)) return res.status(400).json({ error: "id_programare invalid" });

  try {
    const checkRes = await db.query(
      `SELECT id_programare, status FROM programari WHERE id_programare=$1 AND id_locatie=$2 LIMIT 1`,
      [id_programare, id_locatie]
    );
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Programare inexistenta sau fara acces" });
    if (checkRes.rows[0].status === "Anulata") return res.status(400).json({ error: "Programarea este deja anulata" });

    const chitantaRes = await db.query(
      `SELECT nr_chitanta FROM chitante WHERE id_programare=$1 LIMIT 1`,
      [id_programare]
    );
    if (chitantaRes.rows.length > 0) {
      return res.status(409).json({ error: "Nu poti anula o programare pentru care a fost deja emisa chitanta" });
    }

    await db.query(
      `UPDATE programari SET status='Anulata' WHERE id_programare=$1 AND id_locatie=$2`,
      [id_programare, id_locatie]
    );
    return res.json({ message: "Programare anulata", id_programare });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la anularea programarii" });
  }
});

// 5) Finalizează programare
router.patch("/:id_programare/finalizeaza", async (req, res) => {
  const id_programare = Number(req.params.id_programare);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_programare)) return res.status(400).json({ error: "id_programare invalid" });

  try {
    const checkRes = await db.query(
      `SELECT id_programare, status FROM programari WHERE id_programare=$1 AND id_locatie=$2 LIMIT 1`,
      [id_programare, id_locatie]
    );
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Programare inexistenta sau fara acces" });
    if (checkRes.rows[0].status === "Anulata") return res.status(409).json({ error: "Nu poti finaliza o programare anulata" });
    if (checkRes.rows[0].status === "Finalizata") return res.status(409).json({ error: "Programarea este deja finalizata" });

    const result = await db.query(
      `UPDATE programari SET status='Finalizata' WHERE id_programare=$1 AND id_locatie=$2
       RETURNING id_programare, status, id_locatie`,
      [id_programare, id_locatie]
    );
    return res.json({ message: "Programare finalizata", programare: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la finalizarea programarii" });
  }
});

module.exports = router;