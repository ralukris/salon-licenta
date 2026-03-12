const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { requireManagerGeneral } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireManagerGeneral);

function isValidTime(value) {
  if (!value) return false;
  return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(String(value).trim());
}

function normalizeTime(value) {
  const v = String(value).trim();
  return v.length === 5 ? `${v}:00` : v;
}

function normalizeBoolean(value, defaultValue = true) {
  return typeof value === "boolean" ? value : defaultValue;
}

// ======================
// LOCAȚII
// ======================

// 1) Listă locații
router.get("/manager/locatii", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id_locatie,
        denumire,
        adresa,
        telefon,
        activ,
        ora_deschidere,
        ora_inchidere
      FROM locatii
      ORDER BY denumire ASC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /manager/locatii:", err);
    return res.status(500).json({ error: "Eroare la preluarea locatiilor" });
  }
});

// 2) Adaugă locație
router.post("/manager/locatii", async (req, res) => {
  const { denumire, adresa, telefon, ora_deschidere, ora_inchidere } = req.body;

  if (!denumire || !adresa || !ora_deschidere || !ora_inchidere) {
    return res.status(400).json({
      error:
        "Lipsesc campuri obligatorii: denumire, adresa, ora_deschidere, ora_inchidere",
    });
  }

  if (!isValidTime(ora_deschidere) || !isValidTime(ora_inchidere)) {
    return res.status(400).json({
      error: "Format invalid pentru ora_deschidere sau ora_inchidere",
    });
  }

  const openTime = normalizeTime(ora_deschidere);
  const closeTime = normalizeTime(ora_inchidere);

  if (openTime >= closeTime) {
    return res.status(400).json({
      error: "Ora de deschidere trebuie sa fie mai mica decat ora de inchidere",
    });
  }

  try {
    const result = await db.query(
      `
      INSERT INTO locatii
        (denumire, adresa, telefon, activ, ora_deschidere, ora_inchidere)
      VALUES
        ($1, $2, $3, true, $4, $5)
      RETURNING
        id_locatie,
        denumire,
        adresa,
        telefon,
        activ,
        ora_deschidere,
        ora_inchidere
      `,
      [
        String(denumire).trim(),
        String(adresa).trim(),
        telefon ? String(telefon).trim() : null,
        openTime,
        closeTime,
      ]
    );

    return res.status(201).json({
      message: "Locatie adaugata cu succes",
      locatie: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare POST /manager/locatii:", err);
    return res.status(500).json({ error: "Eroare la adaugarea locatiei" });
  }
});

// 3) Editează locație
router.patch("/manager/locatii/:id_locatie", async (req, res) => {
  const id_locatie = Number(req.params.id_locatie);
  const { denumire, adresa, telefon, activ, ora_deschidere, ora_inchidere } =
    req.body;

  if (!Number.isInteger(id_locatie)) {
    return res.status(400).json({ error: "id_locatie invalid" });
  }

  if (!denumire || !adresa || !ora_deschidere || !ora_inchidere) {
    return res.status(400).json({
      error:
        "Lipsesc campuri obligatorii: denumire, adresa, ora_deschidere, ora_inchidere",
    });
  }

  if (!isValidTime(ora_deschidere) || !isValidTime(ora_inchidere)) {
    return res.status(400).json({
      error: "Format invalid pentru ora_deschidere sau ora_inchidere",
    });
  }

  const openTime = normalizeTime(ora_deschidere);
  const closeTime = normalizeTime(ora_inchidere);

  if (openTime >= closeTime) {
    return res.status(400).json({
      error: "Ora de deschidere trebuie sa fie mai mica decat ora de inchidere",
    });
  }

  try {
    const result = await db.query(
      `
      UPDATE locatii
      SET
        denumire = $1,
        adresa = $2,
        telefon = $3,
        activ = $4,
        ora_deschidere = $5,
        ora_inchidere = $6
      WHERE id_locatie = $7
      RETURNING
        id_locatie,
        denumire,
        adresa,
        telefon,
        activ,
        ora_deschidere,
        ora_inchidere
      `,
      [
        String(denumire).trim(),
        String(adresa).trim(),
        telefon ? String(telefon).trim() : null,
        normalizeBoolean(activ, true),
        openTime,
        closeTime,
        id_locatie,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Locatie inexistenta" });
    }

    return res.json({
      message: "Locatie actualizata",
      locatie: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare PATCH /manager/locatii/:id_locatie:", err);
    return res.status(500).json({ error: "Eroare la actualizarea locatiei" });
  }
});

// ======================
// ADMINISTRATORI
// ======================

// 4) Listă administratori
router.get("/manager/administratori", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        a.id_administrator,
        a.id_locatie,
        a.nume,
        a.prenume,
        a.email,
        a.rol,
        a.activ,
        l.denumire AS denumire_locatie
      FROM administratori a
      LEFT JOIN locatii l ON l.id_locatie = a.id_locatie
      ORDER BY a.rol DESC, l.denumire ASC NULLS FIRST, a.nume ASC, a.prenume ASC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Eroare GET /manager/administratori:", err);
    return res
      .status(500)
      .json({ error: "Eroare la preluarea administratorilor" });
  }
});

// 5) Adaugă administrator
router.post("/manager/administratori", async (req, res) => {
  const { id_locatie, nume, prenume, email, parola, rol } = req.body;

  if (!nume || !prenume || !email || !parola || !rol) {
    return res.status(400).json({
      error:
        "Lipsesc campuri obligatorii: nume, prenume, email, parola, rol",
    });
  }

  const allowedRoles = ["Receptie", "ManagerGeneral"];
  if (!allowedRoles.includes(rol)) {
    return res.status(400).json({
      error: "Rol invalid. Valorile permise sunt: Receptie, ManagerGeneral",
    });
  }

  if (rol === "Receptie" && !Number.isInteger(Number(id_locatie))) {
    return res.status(400).json({
      error: "Administratorul de tip Receptie trebuie sa aiba o locatie",
    });
  }

  if (String(parola).length < 6) {
    return res.status(400).json({
      error: "Parola trebuie sa aiba minim 6 caractere",
    });
  }

  try {
    if (rol === "Receptie") {
      const locRes = await db.query(
        `
        SELECT id_locatie
        FROM locatii
        WHERE id_locatie = $1
        LIMIT 1
        `,
        [Number(id_locatie)]
      );

      if (locRes.rows.length === 0) {
        return res.status(404).json({ error: "Locatie inexistenta" });
      }
    }

    const parola_hash = await bcrypt.hash(String(parola), 10);

    const result = await db.query(
      `
      INSERT INTO administratori
        (id_locatie, nume, prenume, email, parola_hash, rol, activ)
      VALUES
        ($1, $2, $3, $4, $5, $6, true)
      RETURNING
        id_administrator,
        id_locatie,
        nume,
        prenume,
        email,
        rol,
        activ
      `,
      [
        rol === "ManagerGeneral" ? null : Number(id_locatie),
        String(nume).trim(),
        String(prenume).trim(),
        String(email).trim().toLowerCase(),
        parola_hash,
        rol,
      ]
    );

    return res.status(201).json({
      message: "Administrator adaugat cu succes",
      administrator: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare POST /manager/administratori:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Exista deja un administrator cu acest email",
      });
    }

    return res
      .status(500)
      .json({ error: "Eroare la adaugarea administratorului" });
  }
});

// 6) Editează administrator
router.patch("/manager/administratori/:id_administrator", async (req, res) => {
  const id_administrator = Number(req.params.id_administrator);
  const { id_locatie, nume, prenume, email, rol, activ } = req.body;

  if (!Number.isInteger(id_administrator)) {
    return res.status(400).json({ error: "id_administrator invalid" });
  }

  if (!nume || !prenume || !email || !rol) {
    return res.status(400).json({
      error: "Lipsesc campuri obligatorii: nume, prenume, email, rol",
    });
  }

  const allowedRoles = ["Receptie", "ManagerGeneral"];
  if (!allowedRoles.includes(rol)) {
    return res.status(400).json({
      error: "Rol invalid. Valorile permise sunt: Receptie, ManagerGeneral",
    });
  }

  if (rol === "Receptie" && !Number.isInteger(Number(id_locatie))) {
    return res.status(400).json({
      error: "Administratorul de tip Receptie trebuie sa aiba o locatie",
    });
  }

  if (
    Number(req.user.id_administrator) === id_administrator &&
    rol !== "ManagerGeneral"
  ) {
    return res.status(400).json({
      error: "Nu iti poti schimba propriul rol din ManagerGeneral",
    });
  }

  if (
    Number(req.user.id_administrator) === id_administrator &&
    normalizeBoolean(activ, true) === false
  ) {
    return res.status(400).json({
      error: "Nu iti poti dezactiva propriul cont",
    });
  }

  try {
    if (rol === "Receptie") {
      const locRes = await db.query(
        `
        SELECT id_locatie
        FROM locatii
        WHERE id_locatie = $1
        LIMIT 1
        `,
        [Number(id_locatie)]
      );

      if (locRes.rows.length === 0) {
        return res.status(404).json({ error: "Locatie inexistenta" });
      }
    }

    const result = await db.query(
      `
      UPDATE administratori
      SET
        id_locatie = $1,
        nume = $2,
        prenume = $3,
        email = $4,
        rol = $5,
        activ = $6
      WHERE id_administrator = $7
      RETURNING
        id_administrator,
        id_locatie,
        nume,
        prenume,
        email,
        rol,
        activ
      `,
      [
        rol === "ManagerGeneral" ? null : Number(id_locatie),
        String(nume).trim(),
        String(prenume).trim(),
        String(email).trim().toLowerCase(),
        rol,
        normalizeBoolean(activ, true),
        id_administrator,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Administrator inexistent" });
    }

    return res.json({
      message: "Administrator actualizat",
      administrator: result.rows[0],
    });
  } catch (err) {
    console.error("Eroare PATCH /manager/administratori/:id_administrator:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Exista deja un administrator cu acest email",
      });
    }

    return res
      .status(500)
      .json({ error: "Eroare la actualizarea administratorului" });
  }
});

// 7) Dezactivează administrator
router.patch(
  "/manager/administratori/:id_administrator/dezactiveaza",
  async (req, res) => {
    const id_administrator = Number(req.params.id_administrator);

    if (!Number.isInteger(id_administrator)) {
      return res.status(400).json({ error: "id_administrator invalid" });
    }

    if (Number(req.user.id_administrator) === id_administrator) {
      return res.status(400).json({
        error: "Nu iti poti dezactiva propriul cont",
      });
    }

    try {
      const result = await db.query(
        `
        UPDATE administratori
        SET activ = false
        WHERE id_administrator = $1
        RETURNING
          id_administrator,
          id_locatie,
          nume,
          prenume,
          email,
          rol,
          activ
        `,
        [id_administrator]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Administrator inexistent" });
      }

      return res.json({
        message: "Administrator dezactivat",
        administrator: result.rows[0],
      });
    } catch (err) {
      console.error(
        "Eroare PATCH /manager/administratori/:id_administrator/dezactiveaza:",
        err
      );
      return res
        .status(500)
        .json({ error: "Eroare la dezactivarea administratorului" });
    }
  }
);

module.exports = router;