const express = require("express");
const db = require("../../config/db");

const router = express.Router();

// 1) Emite chitanță
router.post("/", async (req, res) => {
  const { id_programare } = req.body;
  const id_locatie = req.user.id_locatie;

  if (!id_programare) return res.status(400).json({ error: "Lipseste id_programare" });

  try {
    const progRes = await db.query(
      `SELECT id_programare, status, id_locatie FROM programari
       WHERE id_programare=$1 AND id_locatie=$2 LIMIT 1`,
      [id_programare, id_locatie]
    );
    if (progRes.rows.length === 0) return res.status(404).json({ error: "Programare inexistenta sau fara acces" });
    if (progRes.rows[0].status !== "Finalizata") return res.status(409).json({ error: "Programarea nu este finalizata" });

    const existingRes = await db.query(
      `SELECT nr_chitanta FROM chitante WHERE id_programare=$1 LIMIT 1`,
      [id_programare]
    );
    if (existingRes.rows.length > 0) return res.status(409).json({ error: "Exista deja chitanta pentru aceasta programare" });

    const sumRes = await db.query(
      `SELECT COALESCE(SUM(s.pret), 0) AS suma_totala
       FROM programare_servicii ps
       JOIN servicii s ON s.id_serviciu = ps.id_serviciu
       JOIN programari p ON p.id_programare = ps.id_programare
       WHERE ps.id_programare=$1 AND p.id_locatie=$2`,
      [id_programare, id_locatie]
    );
    const suma_totala = Number(sumRes.rows[0].suma_totala);

    const chitRes = await db.query(
      `INSERT INTO chitante (id_programare, suma_totala)
       VALUES ($1, $2)
       RETURNING nr_chitanta, id_programare, suma_totala, data_emitere`,
      [id_programare, suma_totala]
    );
    return res.status(201).json({ message: "Chitanta emisa", chitanta: chitRes.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Exista deja chitanta pentru aceasta programare" });
    return res.status(500).json({ error: "Eroare la emiterea chitantei" });
  }
});

// 2) Chitanțe disponibile pentru plată
router.get("/disponibile-plata", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  try {
    const result = await db.query(
      `SELECT ch.nr_chitanta, ch.id_programare, ch.suma_totala, ch.data_emitere,
        c.id_client, c.nume AS nume_client, c.prenume AS prenume_client
       FROM chitante ch
       JOIN programari p ON p.id_programare = ch.id_programare
       JOIN clienti c ON c.id_client = p.id_client
       LEFT JOIN plati pl ON pl.nr_chitanta = ch.nr_chitanta
       WHERE p.id_locatie=$1 AND pl.id_plata IS NULL
       ORDER BY ch.data_emitere DESC, ch.nr_chitanta DESC`,
      [id_locatie]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea chitantelor disponibile" });
  }
});

// 3) Istoric chitanțe
router.get("/istoric", async (req, res) => {
  const id_locatie = req.user.id_locatie;
  try {
    const result = await db.query(
      `SELECT ch.nr_chitanta, ch.id_programare, ch.suma_totala, ch.data_emitere,
        c.id_client, c.nume AS nume_client, c.prenume AS prenume_client, c.telefon AS telefon_client,
        pl.id_plata, pl.tip_plata, pl.status_plata, pl.data_plata
       FROM chitante ch
       JOIN programari p ON p.id_programare = ch.id_programare
       JOIN clienti c ON c.id_client = p.id_client
       LEFT JOIN plati pl ON pl.nr_chitanta = ch.nr_chitanta
       WHERE p.id_locatie=$1
       ORDER BY ch.data_emitere DESC, ch.nr_chitanta DESC`,
      [id_locatie]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea istoricului chitantelor" });
  }
});

module.exports = router;