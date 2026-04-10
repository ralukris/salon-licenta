const express = require("express");
const db = require("../../config/db");

const router = express.Router();

// 1) Înregistrează plată
router.post("/", async (req, res) => {
  const { nr_chitanta, tip_plata } = req.body;
  const id_locatie = req.user.id_locatie;

  if (!nr_chitanta) return res.status(400).json({ error: "Lipseste nr_chitanta" });

  const tip = tip_plata || "Card";

  try {
    const chitRes = await db.query(
      `SELECT ch.nr_chitanta FROM chitante ch
       JOIN programari p ON p.id_programare = ch.id_programare
       WHERE ch.nr_chitanta=$1 AND p.id_locatie=$2 LIMIT 1`,
      [nr_chitanta, id_locatie]
    );
    if (chitRes.rows.length === 0) return res.status(404).json({ error: "Chitanta inexistenta sau fara acces" });

    const existingRes = await db.query(
      `SELECT id_plata FROM plati WHERE nr_chitanta=$1 LIMIT 1`,
      [nr_chitanta]
    );
    if (existingRes.rows.length > 0) return res.status(409).json({ error: "Exista deja o plata inregistrata pentru aceasta chitanta" });

    const plataRes = await db.query(
      `INSERT INTO plati (nr_chitanta, tip_plata, status_plata)
       VALUES ($1, $2, 'Finalizata')
       RETURNING id_plata, nr_chitanta, tip_plata, status_plata, data_plata`,
      [nr_chitanta, tip]
    );
    return res.status(201).json({ message: "Plata inregistrata", plata: plataRes.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Exista deja o plata inregistrata pentru aceasta chitanta" });
    return res.status(500).json({ error: "Eroare la inregistrarea platii" });
  }
});

module.exports = router;