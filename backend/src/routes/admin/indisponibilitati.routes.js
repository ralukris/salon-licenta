const express = require("express");
const db = require("../../config/db");

const router = express.Router();

async function getAffectedAppointments(client, id_angajat, id_locatie, data_start, data_final) {
  const result = await client.query(
    `SELECT ps.id_programare_serviciu, ps.id_programare, ps.id_serviciu, ps.id_angajat,
      ps.data_start, ps.data_final, p.status, c.id_client,
      c.nume AS client_nume, c.prenume AS client_prenume, s.denumire_serviciu
     FROM programare_servicii ps
     JOIN programari p ON p.id_programare = ps.id_programare
     JOIN servicii s ON s.id_serviciu = ps.id_serviciu
     JOIN clienti c ON c.id_client = p.id_client
     JOIN angajati a ON a.id_angajat = ps.id_angajat
     WHERE ps.id_angajat=$1 AND a.id_locatie=$2 AND p.id_locatie=$2
       AND p.status IN ('Confirmata', 'Finalizata')
       AND ($3::timestamp < ps.data_final AND $4::timestamp > ps.data_start)
     ORDER BY ps.data_start ASC`,
    [id_angajat, id_locatie, data_start, data_final]
  );
  return result.rows;
}

async function hasUnavailabilityOverlap(client, id_angajat, id_locatie, data_start, data_final) {
  const result = await client.query(
    `SELECT 1 FROM indisponibilitati_angajati ia
     JOIN angajati a ON a.id_angajat = ia.id_angajat
     WHERE ia.id_angajat=$1 AND a.id_locatie=$2
       AND ($3::timestamp < ia.data_final AND $4::timestamp > ia.data_start)
     LIMIT 1`,
    [id_angajat, id_locatie, data_start, data_final]
  );
  return result.rows.length > 0;
}

//Lista indisponibilitati angajat
router.get("/angajati/:id_angajat", async (req, res) => {
  const id_angajat = Number(req.params.id_angajat);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id_angajat)) return res.status(400).json({ error: "id_angajat invalid" });

  try {
    const checkRes = await db.query(
      `SELECT 1 FROM angajati WHERE id_angajat=$1 AND id_locatie=$2 LIMIT 1`,
      [id_angajat, id_locatie]
    );
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Angajat inexistent in locatia ta" });

    const result = await db.query(
      `SELECT ia.id_indisponibilitate, ia.id_angajat, ia.data_start, ia.data_final, ia.tip, ia.motiv, ia.creata_la
       FROM indisponibilitati_angajati ia
       JOIN angajati a ON a.id_angajat = ia.id_angajat
       WHERE ia.id_angajat=$1 AND a.id_locatie=$2
       ORDER BY ia.data_start ASC`,
      [id_angajat, id_locatie]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea indisponibilitatilor" });
  }
});

//Adauga indisponibilitate
router.post("/", async (req, res) => {
  const { id_angajat, data_start, data_final, tip, motiv } = req.body;
  const id_locatie = req.user.id_locatie;

  if (!id_angajat || !data_start || !data_final || !tip) {
    return res.status(400).json({ error: "Lipsesc campuri obligatorii: id_angajat, data_start, data_final, tip" });
  }

  const allowedTypes = ["concediu", "medical", "urgenta"];
  if (!allowedTypes.includes(tip)) {
    return res.status(400).json({ error: "Tip invalid. Valorile permise sunt: concediu, medical, urgenta" });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const empRes = await client.query(
      `SELECT id_angajat, activ, id_locatie FROM angajati WHERE id_angajat=$1`,
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
      `SELECT ($1::timestamp < $2::timestamp) AS interval_valid`,
      [data_start, data_final]
    );
    if (!intervalRes.rows[0].interval_valid) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Interval invalid: data_start trebuie sa fie inainte de data_final" });
    }

    const overlap = await hasUnavailabilityOverlap(client, id_angajat, id_locatie, data_start, data_final);
    if (overlap) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Exista deja o indisponibilitate suprapusa pentru acest angajat" });
    }

    const affectedAppointments = await getAffectedAppointments(client, id_angajat, id_locatie, data_start, data_final);
    if (tip === "concediu" && affectedAppointments.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Concediul nu poate fi introdus deoarece exista programari in intervalul selectat",
        affectedAppointments,
      });
    }

    const insRes = await client.query(
      `INSERT INTO indisponibilitati_angajati (id_angajat, data_start, data_final, tip, motiv)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_indisponibilitate, id_angajat, data_start, data_final, tip, motiv, creata_la`,
      [id_angajat, data_start, data_final, tip, motiv || null]
    );
    await client.query("COMMIT");

    return res.status(201).json({
      message: tip === "concediu" ? "Indisponibilitate de tip concediu adaugata" : "Indisponibilitate adaugata. Programarile afectate trebuie gestionate manual.",
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

//Sterge indisponibilitate
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const id_locatie = req.user.id_locatie;

  if (!Number.isInteger(id)) return res.status(400).json({ error: "id invalid" });

  try {
    const result = await db.query(
      `DELETE FROM indisponibilitati_angajati ia
       USING angajati a
       WHERE ia.id_indisponibilitate=$1 AND a.id_angajat=ia.id_angajat AND a.id_locatie=$2
       RETURNING ia.id_indisponibilitate, ia.id_angajat, ia.data_start, ia.data_final, ia.tip`,
      [id, id_locatie]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Indisponibilitate inexistenta sau fara acces" });
    return res.json({ message: "Indisponibilitate stearsa", indisponibilitate: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la stergerea indisponibilitatii" });
  }
});

module.exports = router;