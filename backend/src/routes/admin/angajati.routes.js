const express = require("express");
const db = require("../../config/db");

const router = express.Router();

function isFutureDateOnly(value) {
  if (!value) return false;
  const inputDate = new Date(value);
  if (Number.isNaN(inputDate.getTime())) return false;
  inputDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate > today;
}

// 1) Lista angajați
router.get("/", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  try {
    const result = await db.query(
      `SELECT id_angajat, id_locatie, nume, prenume, telefon, email,
        specializare, salariu, activ, data_start_program, data_nastere
       FROM angajati WHERE id_locatie = $1 ORDER BY nume ASC, prenume ASC`,
      [id_locatie]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea angajatilor" });
  }
});

// 2) Adaugă angajat
router.post("/", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { nume, prenume, telefon, email, specializare, salariu, data_start_program, data_nastere } = req.body;

  if (!nume || !prenume || !specializare || salariu === undefined || !data_start_program) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii: nume, prenume, specializare, salariu, data_start_program" });
  }
  if (!Number.isFinite(Number(salariu)) || Number(salariu) < 0) {
    return res.status(400).json({ error: "Salariu invalid" });
  }
  if (isFutureDateOnly(data_start_program)) {
    return res.status(400).json({ error: "Data angajarii nu poate fi in viitor" });
  }
  if (data_nastere && isFutureDateOnly(data_nastere)) {
    return res.status(400).json({ error: "Data nasterii nu poate fi in viitor" });
  }

  try {
    const result = await db.query(
      `INSERT INTO angajati (id_locatie, nume, prenume, telefon, email, specializare, salariu, activ, data_start_program, data_nastere)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
       RETURNING id_angajat, id_locatie, nume, prenume, telefon, email, specializare, salariu, activ, data_start_program, data_nastere`,
      [id_locatie, String(nume).trim(), String(prenume).trim(),
        telefon ? String(telefon).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        String(specializare).trim(), Number(salariu), data_start_program, data_nastere || null]
    );
    return res.status(201).json({ message: "Angajat adaugat cu succes", angajat: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Email deja folosit" });
    if (err.code === "23514") return res.status(400).json({ error: "Date invalide pentru angajat." });
    return res.status(500).json({ error: "Eroare la adaugarea angajatului" });
  }
});

// 3) Editează angajat
router.patch("/:id_angajat", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;
  const { nume, prenume, telefon, email, specializare, salariu, data_start_program, data_nastere } = req.body;

  if (!Number.isInteger(id_angajat)) return res.status(400).json({ error: "id_angajat invalid" });
  if (!nume || !prenume || !specializare || salariu === undefined || !data_start_program) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii" });
  }
  if (!Number.isFinite(Number(salariu)) || Number(salariu) < 0) return res.status(400).json({ error: "Salariu invalid" });
  if (isFutureDateOnly(data_start_program)) return res.status(400).json({ error: "Data angajarii nu poate fi in viitor" });
  if (data_nastere && isFutureDateOnly(data_nastere)) return res.status(400).json({ error: "Data nasterii nu poate fi in viitor" });

  try {
    const result = await db.query(
      `UPDATE angajati SET nume=$1, prenume=$2, telefon=$3, email=$4, specializare=$5,
        salariu=$6, data_start_program=$7, data_nastere=$8
       WHERE id_angajat=$9 AND id_locatie=$10
       RETURNING id_angajat, id_locatie, nume, prenume, telefon, email, specializare, salariu, activ, data_start_program, data_nastere`,
      [String(nume).trim(), String(prenume).trim(),
        telefon ? String(telefon).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        String(specializare).trim(), Number(salariu),
        data_start_program, data_nastere || null, id_angajat, id_locatie]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    return res.json({ message: "Angajat actualizat", angajat: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Email deja folosit" });
    if (err.code === "23514") return res.status(400).json({ error: "Date invalide pentru angajat." });
    return res.status(500).json({ error: "Eroare la actualizarea angajatului" });
  }
});

// 4) Setează angajat inactiv
router.patch("/:id_angajat/inactiv", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;
  if (!Number.isInteger(id_angajat)) return res.status(400).json({ error: "id_angajat invalid" });
  try {
    const result = await db.query(
      `UPDATE angajati SET activ=false WHERE id_angajat=$1 AND id_locatie=$2
       RETURNING id_angajat, id_locatie, nume, prenume, telefon, email, specializare, salariu, activ, data_start_program, data_nastere`,
      [id_angajat, id_locatie]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    return res.json({ message: "Angajat setat inactiv", angajat: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la actualizarea statusului angajatului" });
  }
});

// 4.1) Reactivează angajat
router.patch("/:id_angajat/activ", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;
  if (!Number.isInteger(id_angajat)) return res.status(400).json({ error: "id_angajat invalid" });
  try {
    const result = await db.query(
      `UPDATE angajati SET activ=true WHERE id_angajat=$1 AND id_locatie=$2
       RETURNING id_angajat, id_locatie, nume, prenume, telefon, email, specializare, salariu, activ, data_start_program, data_nastere`,
      [id_angajat, id_locatie]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    return res.json({ message: "Angajat reactivat", angajat: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la reactivarea angajatului" });
  }
});

// 4.2) Servicii angajat - GET
router.get("/:id_angajat/servicii", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;
  if (!Number.isInteger(id_angajat)) return res.status(400).json({ error: "id_angajat invalid" });
  try {
    const checkRes = await db.query(
      `SELECT 1 FROM angajati WHERE id_angajat=$1 AND id_locatie=$2 LIMIT 1`,
      [id_angajat, id_locatie]
    );
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    const result = await db.query(
      `SELECT id_serviciu FROM angajat_servicii WHERE id_angajat=$1`,
      [id_angajat]
    );
    return res.json(result.rows.map((r) => r.id_serviciu));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea serviciilor angajatului" });
  }
});

// 4.3) Servicii angajat - POST
router.post("/:id_angajat/servicii", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;
  const { servicii } = req.body;
  if (!Number.isInteger(id_angajat)) return res.status(400).json({ error: "id_angajat invalid" });
  if (!Array.isArray(servicii)) return res.status(400).json({ error: "servicii trebuie sa fie un array" });

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const checkRes = await client.query(
      `SELECT 1 FROM angajati WHERE id_angajat=$1 AND id_locatie=$2 LIMIT 1`,
      [id_angajat, id_locatie]
    );
    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Angajat inexistent sau fara acces" });
    }
    await client.query(`DELETE FROM angajat_servicii WHERE id_angajat=$1`, [id_angajat]);
    for (const id_serviciu of servicii) {
      if (Number.isInteger(Number(id_serviciu))) {
        await client.query(
          `INSERT INTO angajat_servicii (id_angajat, id_serviciu) VALUES ($1, $2)`,
          [id_angajat, Number(id_serviciu)]
        );
      }
    }
    await client.query("COMMIT");
    return res.json({ message: "Servicii actualizate cu succes" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Eroare la actualizarea serviciilor angajatului" });
  } finally {
    client.release();
  }
});

module.exports = router;