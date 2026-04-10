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

// 1) Căutare clienți
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);

  const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return res.json([]);

  try {
    const conditions = [];
    const values = [];
    tokens.forEach((token, index) => {
      const value = `%${token}%`;
      const base = index * 6;
      conditions.push(`(
        LOWER(COALESCE(c.nume, '')) LIKE LOWER($${base + 1})
        OR LOWER(COALESCE(c.prenume, '')) LIKE LOWER($${base + 2})
        OR LOWER(COALESCE(c.nume, '') || ' ' || COALESCE(c.prenume, '')) LIKE LOWER($${base + 3})
        OR LOWER(COALESCE(c.prenume, '') || ' ' || COALESCE(c.nume, '')) LIKE LOWER($${base + 4})
        OR LOWER(COALESCE(c.telefon, '')) LIKE LOWER($${base + 5})
        OR LOWER(COALESCE(ct.email, '')) LIKE LOWER($${base + 6})
      )`);
      values.push(value, value, value, value, value, value);
    });

    const query = `
      SELECT c.id_client, c.id_cont, c.nume, c.prenume, c.telefon, c.data_nasterii, ct.email
      FROM clienti c
      LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.nume ASC, c.prenume ASC
      LIMIT 10
    `;

    const result = await db.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la cautarea clientilor" });
  }
});

// 2) Lista toți clienții
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id_client, c.id_cont, c.nume, c.prenume, c.telefon, c.data_nasterii, ct.email
       FROM clienti c
       LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
       ORDER BY c.nume ASC, c.prenume ASC, c.id_client ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea clientilor" });
  }
});

// 3) Adaugă client
router.post("/", async (req, res) => {
  const { nume, prenume, telefon, data_nasterii } = req.body;
  if (!nume || !prenume || !telefon || !data_nasterii) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii: nume, prenume, telefon, data_nasterii" });
  }
  if (isFutureDateOnly(data_nasterii)) {
    return res.status(400).json({ error: "Data nasterii nu poate fi in viitor" });
  }

  const numeCurat = String(nume).trim();
  const prenumeCurat = String(prenume).trim();
  const telefonCurat = String(telefon).trim();

  const clientDb = await db.pool.connect();
  try {
    await clientDb.query("BEGIN");
    const existsRes = await clientDb.query(
      `SELECT c.id_client, c.id_cont, c.nume, c.prenume, c.telefon, c.data_nasterii, ct.email
       FROM clienti c LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
       WHERE c.telefon=$1 LIMIT 1`,
      [telefonCurat]
    );
    if (existsRes.rows.length > 0) {
      await clientDb.query("ROLLBACK");
      return res.status(409).json({ error: "Exista deja un client cu acest telefon", client: existsRes.rows[0] });
    }
    const result = await clientDb.query(
      `INSERT INTO clienti (id_cont, nume, prenume, data_nasterii, telefon)
       VALUES (NULL, $1, $2, $3, $4)
       RETURNING id_client, id_cont, nume, prenume, telefon, data_nasterii`,
      [numeCurat, prenumeCurat, data_nasterii, telefonCurat]
    );
    await clientDb.query("COMMIT");
    return res.status(201).json({ message: "Client adaugat cu succes", client: result.rows[0] });
  } catch (err) {
    try { await clientDb.query("ROLLBACK"); } catch {}
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Date duplicate pentru client" });
    if (err.code === "23514") return res.status(400).json({ error: "Date invalide pentru client" });
    return res.status(500).json({ error: "Eroare la adaugarea clientului" });
  } finally {
    clientDb.release();
  }
});

// 4) Editează client
router.patch("/:id_client", async (req, res) => {
  const id_client = Number(req.params.id_client);
  const { nume, prenume, telefon, data_nasterii, email } = req.body;

  if (!Number.isInteger(id_client)) return res.status(400).json({ error: "id_client invalid" });
  if (!nume || !prenume || !telefon || !data_nasterii) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii" });
  }
  if (isFutureDateOnly(data_nasterii)) {
    return res.status(400).json({ error: "Data nasterii nu poate fi in viitor" });
  }

  const numeCurat = String(nume).trim();
  const prenumeCurat = String(prenume).trim();
  const telefonCurat = String(telefon).trim();
  const emailCurat = email ? String(email).trim().toLowerCase() : null;

  const clientDb = await db.pool.connect();
  try {
    await clientDb.query("BEGIN");
    const existingRes = await clientDb.query(
      `SELECT c.id_client, c.id_cont FROM clienti c WHERE c.id_client=$1 LIMIT 1`,
      [id_client]
    );
    if (existingRes.rows.length === 0) {
      await clientDb.query("ROLLBACK");
      return res.status(404).json({ error: "Client inexistent" });
    }
    const existingClient = existingRes.rows[0];
    const phoneConflictRes = await clientDb.query(
      `SELECT id_client FROM clienti WHERE telefon=$1 AND id_client<>$2 LIMIT 1`,
      [telefonCurat, id_client]
    );
    if (phoneConflictRes.rows.length > 0) {
      await clientDb.query("ROLLBACK");
      return res.status(409).json({ error: "Exista deja un alt client cu acest telefon" });
    }
    await clientDb.query(
      `UPDATE clienti SET nume=$1, prenume=$2, telefon=$3, data_nasterii=$4 WHERE id_client=$5`,
      [numeCurat, prenumeCurat, telefonCurat, data_nasterii, id_client]
    );
    if (existingClient.id_cont && emailCurat !== null) {
      const emailConflictRes = await clientDb.query(
        `SELECT id_cont FROM conturi WHERE email=$1 AND id_cont<>$2 LIMIT 1`,
        [emailCurat, existingClient.id_cont]
      );
      if (emailConflictRes.rows.length > 0) {
        await clientDb.query("ROLLBACK");
        return res.status(409).json({ error: "Exista deja un alt cont cu acest email" });
      }
      await clientDb.query(`UPDATE conturi SET email=$1 WHERE id_cont=$2`, [emailCurat, existingClient.id_cont]);
    }
    const finalRes = await clientDb.query(
      `SELECT c.id_client, c.id_cont, c.nume, c.prenume, c.telefon, c.data_nasterii, ct.email
       FROM clienti c LEFT JOIN conturi ct ON ct.id_cont = c.id_cont
       WHERE c.id_client=$1 LIMIT 1`,
      [id_client]
    );
    await clientDb.query("COMMIT");
    return res.json({ message: "Client actualizat cu succes", client: finalRes.rows[0] });
  } catch (err) {
    try { await clientDb.query("ROLLBACK"); } catch {}
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Date duplicate pentru client" });
    if (err.code === "23514") return res.status(400).json({ error: "Date invalide pentru client" });
    return res.status(500).json({ error: "Eroare la actualizarea clientului" });
  } finally {
    clientDb.release();
  }
});

module.exports = router;