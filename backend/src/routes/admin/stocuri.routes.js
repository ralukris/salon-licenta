const express = require("express");
const db = require("../../config/db");

const router = express.Router();

// 1) Lista stocuri
router.get("/", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  try {
    const result = await db.query(
      `SELECT s.id_stoc, s.id_locatie, s.id_produs, s.cantitate,
        p.denumire_produs, p.unitate_masura, p.activ
       FROM stocuri s
       JOIN produse p ON p.id_produs = s.id_produs
       WHERE s.id_locatie=$1
       ORDER BY p.denumire_produs ASC`,
      [id_locatie]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea stocurilor" });
  }
});

// 2) Adaugă produs + stoc
router.post("/", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  const { denumire_produs, unitate_masura, cantitate } = req.body;

  if (!denumire_produs || !unitate_masura || cantitate === undefined) {
    return res.status(400).json({ error: "Lipsesc campuri: denumire_produs, unitate_masura, cantitate" });
  }
  if (!Number.isFinite(Number(cantitate)) || Number(cantitate) < 0) {
    return res.status(400).json({ error: "Cantitate invalida" });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const produsRes = await client.query(
      `INSERT INTO produse (denumire_produs, unitate_masura, activ)
       VALUES ($1, $2, true)
       RETURNING id_produs, denumire_produs, unitate_masura, activ`,
      [String(denumire_produs).trim(), String(unitate_masura).trim()]
    );
    const produs = produsRes.rows[0];
    const stocRes = await client.query(
      `INSERT INTO stocuri (id_locatie, id_produs, cantitate)
       VALUES ($1, $2, $3)
       RETURNING id_stoc, id_locatie, id_produs, cantitate`,
      [id_locatie, produs.id_produs, Number(cantitate)]
    );
    await client.query("COMMIT");
    return res.status(201).json({ message: "Produs adaugat cu succes", produs, stoc: stocRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Eroare la adaugarea produsului" });
  } finally {
    client.release();
  }
});

// 3) Editare stoc
router.patch("/:id_stoc", async (req, res) => {
  const id_stoc = Number(req.params.id_stoc);
  const id_locatie = req.user.id_locatie;
  const { cantitate } = req.body;

  if (!Number.isInteger(id_stoc)) return res.status(400).json({ error: "id_stoc invalid" });
  if (!Number.isFinite(Number(cantitate)) || Number(cantitate) < 0) {
    return res.status(400).json({ error: "Cantitate invalida" });
  }

  try {
    const result = await db.query(
      `UPDATE stocuri SET cantitate=$1 WHERE id_stoc=$2 AND id_locatie=$3
       RETURNING id_stoc, id_locatie, id_produs, cantitate`,
      [Number(cantitate), id_stoc, id_locatie]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Stoc inexistent sau fara acces" });
    return res.json({ message: "Stoc actualizat", stoc: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la actualizarea stocului" });
  }
});

// 4) Dezactivare produs
router.patch("/:id_produs/dezactiveaza", async (req, res) => {
  const id_produs = Number(req.params.id_produs);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_produs)) return res.status(400).json({ error: "id_produs invalid" });

  try {
    const checkRes = await db.query(
      `SELECT 1 FROM stocuri WHERE id_produs=$1 AND id_locatie=$2 LIMIT 1`,
      [id_produs, id_locatie]
    );
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Produs inexistent in locatia ta" });

    const result = await db.query(
      `UPDATE produse SET activ=false WHERE id_produs=$1
       RETURNING id_produs, denumire_produs, unitate_masura, activ`,
      [id_produs]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Produs inexistent" });
    return res.json({ message: "Produs dezactivat", produs: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la dezactivarea produsului" });
  }
});

// 5) Reactivare produs
router.patch("/:id_produs/activeaza", async (req, res) => {
  const id_produs = Number(req.params.id_produs);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_produs)) return res.status(400).json({ error: "id_produs invalid" });

  try {
    const checkRes = await db.query(
      `SELECT 1 FROM stocuri WHERE id_produs=$1 AND id_locatie=$2 LIMIT 1`,
      [id_produs, id_locatie]
    );
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Produs inexistent in locatia ta" });

    const result = await db.query(
      `UPDATE produse SET activ=true WHERE id_produs=$1
       RETURNING id_produs, denumire_produs, unitate_masura, activ`,
      [id_produs]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Produs inexistent" });
    return res.json({ message: "Produs reactivat", produs: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la reactivarea produsului" });
  }
});

module.exports = router;