const express = require("express");
const db = require("../../config/db");

const router = express.Router();

//Lista servicii
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id_serviciu, denumire_serviciu, pret, durata_minute, activ
       FROM servicii ORDER BY denumire_serviciu ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea serviciilor" });
  }
});

//Adauga serviciu
router.post("/", async (req, res) => {
  const { denumire_serviciu, pret, durata_minute } = req.body;
  if (!denumire_serviciu || pret === undefined || durata_minute === undefined) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii: denumire_serviciu, pret, durata_minute" });
  }
  if (!Number.isFinite(Number(pret)) || Number(pret) < 0) {
    return res.status(400).json({ error: "Pret invalid" });
  }
  if (!Number.isInteger(Number(durata_minute)) || Number(durata_minute) <= 0) {
    return res.status(400).json({ error: "Durata invalida" });
  }
  try {
    const result = await db.query(
      `INSERT INTO servicii (denumire_serviciu, pret, durata_minute, activ)
       VALUES ($1, $2, $3, true)
       RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ`,
      [String(denumire_serviciu).trim(), Number(pret), Number(durata_minute)]
    );
    return res.status(201).json({ message: "Serviciu adaugat cu succes", serviciu: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Exista deja un serviciu cu aceasta denumire" });
    return res.status(500).json({ error: "Eroare la adaugarea serviciului" });
  }
});

//Editeaza serviciu
router.patch("/:id_serviciu", async (req, res) => {
  const id_serviciu = Number(req.params.id_serviciu);
  const { denumire_serviciu, pret, durata_minute } = req.body;

  if (!Number.isInteger(id_serviciu)) return res.status(400).json({ error: "id_serviciu invalid" });
  if (!denumire_serviciu || pret === undefined || durata_minute === undefined) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii" });
  }
  if (!Number.isFinite(Number(pret)) || Number(pret) < 0) return res.status(400).json({ error: "Pret invalid" });
  if (!Number.isInteger(Number(durata_minute)) || Number(durata_minute) <= 0) return res.status(400).json({ error: "Durata invalida" });

  try {
    const result = await db.query(
      `UPDATE servicii SET denumire_serviciu=$1, pret=$2, durata_minute=$3
       WHERE id_serviciu=$4
       RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ`,
      [String(denumire_serviciu).trim(), Number(pret), Number(durata_minute), id_serviciu]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Serviciu inexistent" });
    return res.json({ message: "Serviciu actualizat", serviciu: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Exista deja un serviciu cu aceasta denumire" });
    return res.status(500).json({ error: "Eroare la actualizarea serviciului" });
  }
});

//Dezactiveaza serviciu
router.patch("/:id_serviciu/dezactiveaza", async (req, res) => {
  const id_serviciu = Number(req.params.id_serviciu);
  if (!Number.isInteger(id_serviciu)) return res.status(400).json({ error: "id_serviciu invalid" });
  try {
    const result = await db.query(
      `UPDATE servicii SET activ=false WHERE id_serviciu=$1
       RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ`,
      [id_serviciu]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Serviciu inexistent" });
    return res.json({ message: "Serviciu dezactivat", serviciu: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la dezactivarea serviciului" });
  }
});

//Reactiveaza serviciu
router.patch("/:id_serviciu/activeaza", async (req, res) => {
  const id_serviciu = Number(req.params.id_serviciu);
  if (!Number.isInteger(id_serviciu)) return res.status(400).json({ error: "id_serviciu invalid" });
  try {
    const result = await db.query(
      `UPDATE servicii SET activ=true WHERE id_serviciu=$1
       RETURNING id_serviciu, denumire_serviciu, pret, durata_minute, activ`,
      [id_serviciu]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Serviciu inexistent" });
    return res.json({ message: "Serviciu reactivat", serviciu: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la reactivarea serviciului" });
  }
});

module.exports = router;