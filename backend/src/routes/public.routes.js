const express = require("express");
const db = require("../config/db");
const {
  isEmployeeAvailable,
  isDateInAllowedWindow,
  isEmployeeWorkingOnDate,
  getEmployeeWorkContext,
} = require("../services/availability.service");
const {
  getAvailableSlotsForSegments,
} = require("../services/booking.service");

const router = express.Router();

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatLocalTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDateTime(dateString, timeValue) {
  const cleanTime = String(timeValue).slice(0, 8);
  return new Date(`${dateString}T${cleanTime}`);
}

// 1) Lista locații active
router.get("/public/locatii", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT id_locatie, denumire, adresa, telefon
      FROM locatii
      WHERE activ = true
      ORDER BY denumire ASC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea locațiilor" });
  }
});

// 2) Lista servicii active
router.get("/public/servicii", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT id_serviciu, denumire_serviciu, pret, durata_minute
      FROM servicii
      WHERE activ = true
      ORDER BY denumire_serviciu ASC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea serviciilor" });
  }
});

// 3) Angajați care pot executa un serviciu într-o locație
router.get("/public/locatii/:id_locatie/servicii/:id_serviciu/angajati", async (req, res) => {
  const id_locatie = Number(req.params.id_locatie);
  const id_serviciu = Number(req.params.id_serviciu);

  if (!Number.isInteger(id_locatie) || !Number.isInteger(id_serviciu)) {
    return res.status(400).json({ error: "Parametri invalizi" });
  }

  try {
    const result = await db.query(
      `
      SELECT a.id_angajat, a.nume, a.prenume, a.specializare
      FROM angajati a
      INNER JOIN angajat_servicii asv ON asv.id_angajat = a.id_angajat
      INNER JOIN locatii l ON l.id_locatie = a.id_locatie
      INNER JOIN servicii s ON s.id_serviciu = asv.id_serviciu
      WHERE a.activ = true
        AND l.activ = true
        AND s.activ = true
        AND a.id_locatie = $1
        AND asv.id_serviciu = $2
      ORDER BY a.nume ASC, a.prenume ASC
      `,
      [id_locatie, id_serviciu]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la preluarea angajaților" });
  }
});

// 4) Verificare disponibilitate completă pentru un interval
router.post("/public/disponibilitate", async (req, res) => {
  const { id_angajat, data_start, data_final } = req.body;

  if (!id_angajat || !data_start || !data_final) {
    return res.status(400).json({
      error: "Lipsesc câmpuri obligatorii: id_angajat, data_start, data_final",
    });
  }

  try {
    const disponibil = await isEmployeeAvailable(
      Number(id_angajat),
      data_start,
      data_final
    );

    return res.json({ disponibil });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la verificarea disponibilității" });
  }
});

// 5) Sloturi disponibile pentru un angajat + serviciu + dată
router.get("/public/sloturi-disponibile", async (req, res) => {
  const id_angajat = Number(req.query.id_angajat);
  const id_serviciu = Number(req.query.id_serviciu);
  const data = req.query.data;

  if (!Number.isInteger(id_angajat) || !Number.isInteger(id_serviciu) || !data) {
    return res.status(400).json({ error: "Parametri lipsă sau invalizi" });
  }

  try {
    if (!isDateInAllowedWindow(data)) {
      return res.json([]);
    }

    const durRes = await db.query(
      `
      SELECT id_serviciu, durata_minute, activ
      FROM servicii
      WHERE id_serviciu = $1
      `,
      [id_serviciu]
    );

    if (durRes.rows.length === 0) {
      return res.status(404).json({ error: "Serviciu invalid" });
    }

    if (durRes.rows[0].activ === false) {
      return res.json([]);
    }

    const durata = Number(durRes.rows[0].durata_minute);

    if (!Number.isFinite(durata) || durata <= 0) {
      return res.json([]);
    }

    const employee = await getEmployeeWorkContext(id_angajat);

    if (!employee || !employee.activ || !employee.data_start_program) {
      return res.json([]);
    }

    const skillRes = await db.query(
      `
      SELECT 1
      FROM angajat_servicii
      WHERE id_angajat = $1
        AND id_serviciu = $2
      LIMIT 1
      `,
      [id_angajat, id_serviciu]
    );

    if (skillRes.rows.length === 0) {
      return res.json([]);
    }

    if (!isEmployeeWorkingOnDate(employee.data_start_program, data)) {
      return res.json([]);
    }

    const locRes = await db.query(
      `
      SELECT l.id_locatie, l.ora_deschidere, l.ora_inchidere, l.activ
      FROM angajati a
      JOIN locatii l ON l.id_locatie = a.id_locatie
      WHERE a.id_angajat = $1
      `,
      [id_angajat]
    );

    if (locRes.rows.length === 0) {
      return res.json([]);
    }

    if (locRes.rows[0].activ === false) {
      return res.json([]);
    }

    const { ora_deschidere, ora_inchidere } = locRes.rows[0];

    if (!ora_deschidere || !ora_inchidere) {
      return res.json([]);
    }

    const startOfDay = buildDateTime(data, ora_deschidere);
    const endOfDay = buildDateTime(data, ora_inchidere);

    if (Number.isNaN(startOfDay.getTime()) || Number.isNaN(endOfDay.getTime())) {
      return res.status(400).json({ error: "Program invalid pentru locație" });
    }

    if (startOfDay >= endOfDay) {
      return res.json([]);
    }

    const slots = [];
    const intervalMinutes = 15;
    let current = new Date(startOfDay);

    while (current.getTime() + durata * 60000 <= endOfDay.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + durata * 60000);

      const slotStartSql = formatLocalDateTime(slotStart);
      const slotEndSql = formatLocalDateTime(slotEnd);

      const disponibil = await isEmployeeAvailable(
        id_angajat,
        slotStartSql,
        slotEndSql
      );

      if (disponibil) {
        slots.push(formatLocalTime(slotStart));
      }

      current = new Date(current.getTime() + intervalMinutes * 60000);
    }

    return res.json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la generare sloturi" });
  }
});

// 6) Sloturi generale pentru un serviciu într-o locație și într-o zi
// Returnează intervalele + angajații disponibili pe fiecare interval
router.get("/public/sloturi-disponibile-generale", async (req, res) => {
  const id_locatie = Number(req.query.id_locatie);
  const id_serviciu = Number(req.query.id_serviciu);
  const data = req.query.data;

  if (!Number.isInteger(id_locatie) || !Number.isInteger(id_serviciu) || !data) {
    return res.status(400).json({ error: "Parametri lipsă sau invalizi" });
  }

  try {
    if (!isDateInAllowedWindow(data)) {
      return res.json([]);
    }

    const serviceRes = await db.query(
      `
      SELECT id_serviciu, durata_minute, activ
      FROM servicii
      WHERE id_serviciu = $1
      `,
      [id_serviciu]
    );

    if (serviceRes.rows.length === 0) {
      return res.status(404).json({ error: "Serviciu invalid" });
    }

    const serviciu = serviceRes.rows[0];

    if (serviciu.activ === false) {
      return res.json([]);
    }

    const durata = Number(serviciu.durata_minute);

    if (!Number.isFinite(durata) || durata <= 0) {
      return res.json([]);
    }

    const locRes = await db.query(
      `
      SELECT id_locatie, ora_deschidere, ora_inchidere, activ
      FROM locatii
      WHERE id_locatie = $1
      LIMIT 1
      `,
      [id_locatie]
    );

    if (locRes.rows.length === 0) {
      return res.status(404).json({ error: "Locație invalidă" });
    }

    const locatie = locRes.rows[0];

    if (locatie.activ === false) {
      return res.json([]);
    }

    if (!locatie.ora_deschidere || !locatie.ora_inchidere) {
      return res.json([]);
    }

    const startOfDay = buildDateTime(data, locatie.ora_deschidere);
    const endOfDay = buildDateTime(data, locatie.ora_inchidere);

    if (Number.isNaN(startOfDay.getTime()) || Number.isNaN(endOfDay.getTime())) {
      return res.status(400).json({ error: "Program invalid pentru locație" });
    }

    if (startOfDay >= endOfDay) {
      return res.json([]);
    }

    const employeesRes = await db.query(
      `
      SELECT a.id_angajat, a.nume, a.prenume, a.activ, a.data_start_program
      FROM angajati a
      INNER JOIN angajat_servicii ags ON ags.id_angajat = a.id_angajat
      WHERE a.id_locatie = $1
        AND a.activ = true
        AND ags.id_serviciu = $2
      ORDER BY a.nume ASC, a.prenume ASC
      `,
      [id_locatie, id_serviciu]
    );

    if (employeesRes.rows.length === 0) {
      return res.json([]);
    }

    const validEmployees = employeesRes.rows.filter(
      (emp) =>
        emp.activ === true &&
        emp.data_start_program &&
        isEmployeeWorkingOnDate(emp.data_start_program, data)
    );

    if (validEmployees.length === 0) {
      return res.json([]);
    }

    const intervalMinutes = 15;
    const result = [];
    let current = new Date(startOfDay);

    while (current.getTime() + durata * 60000 <= endOfDay.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + durata * 60000);

      const slotStartSql = formatLocalDateTime(slotStart);
      const slotEndSql = formatLocalDateTime(slotEnd);

      const availableEmployees = [];

      for (const employee of validEmployees) {
        const disponibil = await isEmployeeAvailable(
          Number(employee.id_angajat),
          slotStartSql,
          slotEndSql
        );

        if (disponibil) {
          availableEmployees.push({
            id_angajat: employee.id_angajat,
            nume: employee.nume,
            prenume: employee.prenume,
          });
        }
      }

      if (availableEmployees.length > 0) {
        result.push({
          ora: formatLocalTime(slotStart),
          angajati: availableEmployees,
        });
      }

      current = new Date(current.getTime() + intervalMinutes * 60000);
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la generare sloturi generale" });
  }
});

// 7) Sloturi disponibile pentru mai multe servicii consecutive
router.post("/public/sloturi-disponibile-multiple", async (req, res) => {
  const { id_locatie, data, segmente } = req.body;

  if (!id_locatie || !data || !Array.isArray(segmente) || segmente.length === 0) {
    return res.status(400).json({
      error: "Lipsesc câmpuri obligatorii: id_locatie, data, segmente",
    });
  }

  try {
    const normalizedSegments = segmente.map((segment) => ({
      id_serviciu: Number(segment.id_serviciu),
      id_angajat: Number(segment.id_angajat),
    }));

    const invalidSegment = normalizedSegments.find(
      (segment) =>
        !Number.isInteger(segment.id_serviciu) ||
        !Number.isInteger(segment.id_angajat)
    );

    if (invalidSegment) {
      return res.status(400).json({
        error: "Fiecare segment trebuie să conțină id_serviciu și id_angajat valide",
      });
    }

    const slots = await getAvailableSlotsForSegments({
      id_locatie: Number(id_locatie),
      data,
      segmente: normalizedSegments,
    });

    return res.json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message || "Eroare la generarea sloturilor pentru segmente multiple",
    });
  }
});

module.exports = router;