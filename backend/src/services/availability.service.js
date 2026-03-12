const db = require("../config/db");

function toDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Dată invalidă");
  }

  return date;
}

function normalizeDateOnly(dateInput) {
  const d = toDate(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateOnly(dateInput) {
  const d = toDate(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeHHMM(dateInput) {
  const d = toDate(dateInput);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeTimeString(timeValue) {
  if (!timeValue) {
    throw new Error("Oră invalidă");
  }

  return String(timeValue).slice(0, 5);
}

function combineDateAndTime(dateInput, timeString) {
  const base = normalizeDateOnly(dateInput);
  const [hour, minute] = normalizeTimeString(timeString).split(":").map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Oră invalidă");
  }

  base.setHours(hour, minute, 0, 0);
  return base;
}

function addMinutesToDate(dateInput, minutes) {
  const d = toDate(dateInput);
  const mins = Number(minutes);

  if (!Number.isFinite(mins)) {
    throw new Error("Număr invalid de minute");
  }

  return new Date(d.getTime() + mins * 60000);
}

function isDateInAllowedWindow(dateInput) {
  const selected = normalizeDateOnly(dateInput);
  const today = new Date();

  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  startOfCurrentMonth.setHours(0, 0, 0, 0);
  endOfNextMonth.setHours(23, 59, 59, 999);

  return selected >= startOfCurrentMonth && selected <= endOfNextMonth;
}

function isEmployeeWorkingOnDate(dataStartProgram, selectedDate) {
  const start = normalizeDateOnly(dataStartProgram);
  const selected = normalizeDateOnly(selectedDate);

  const diffTime = selected.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const cycleDay = ((diffDays % 4) + 4) % 4;

  return cycleDay === 0 || cycleDay === 1;
}

async function getEmployeeWorkContext(id_angajat) {
  const result = await db.query(
    `
    SELECT id_angajat, id_locatie, activ, data_start_program
    FROM angajati
    WHERE id_angajat = $1
    `,
    [id_angajat]
  );

  if (result.rows.length === 0) {
    throw new Error("Angajat invalid");
  }

  return result.rows[0];
}

async function getLocationSchedule(id_locatie) {
  const result = await db.query(
    `
    SELECT id_locatie, activ, ora_deschidere, ora_inchidere
    FROM locatii
    WHERE id_locatie = $1
    `,
    [id_locatie]
  );

  if (result.rows.length === 0) {
    throw new Error("Locație invalidă");
  }

  return result.rows[0];
}

async function hasUnavailability(id_angajat, data_start, data_final) {
  const result = await db.query(
    `
    SELECT 1
    FROM indisponibilitati_angajati
    WHERE id_angajat = $1
      AND data_start < $3::timestamp
      AND data_final > $2::timestamp
    LIMIT 1
    `,
    [id_angajat, data_start, data_final]
  );

  return result.rows.length > 0;
}

async function hasBookingConflict(id_angajat, data_start, data_final) {
  const result = await db.query(
    `
    SELECT 1
    FROM programare_servicii ps
    JOIN programari p ON p.id_programare = ps.id_programare
    WHERE ps.id_angajat = $1
      AND p.status IN ('Confirmata', 'Finalizata')
      AND ($2::timestamp < ps.data_final AND $3::timestamp > ps.data_start)
    LIMIT 1
    `,
    [id_angajat, data_start, data_final]
  );

  return result.rows.length > 0;
}

async function isEmployeeAvailable(id_angajat, data_start, data_final) {
  if (!isDateInAllowedWindow(data_start)) {
    return false;
  }

  const startDate = toDate(data_start);
  const endDate = toDate(data_final);

  if (endDate <= startDate) {
    return false;
  }

  const employee = await getEmployeeWorkContext(id_angajat);

  if (!employee || employee.activ === false) {
    return false;
  }

  if (!employee.data_start_program) {
    return false;
  }

  if (!isEmployeeWorkingOnDate(employee.data_start_program, startDate)) {
    return false;
  }

  const location = await getLocationSchedule(employee.id_locatie);

  if (!location || location.activ === false) {
    return false;
  }

  if (!location.ora_deschidere || !location.ora_inchidere) {
    return false;
  }

  const scheduleStart = combineDateAndTime(startDate, location.ora_deschidere);
  const scheduleEnd = combineDateAndTime(startDate, location.ora_inchidere);

  if (startDate < scheduleStart || endDate > scheduleEnd) {
    return false;
  }

  const unavailable = await hasUnavailability(id_angajat, startDate, endDate);
  if (unavailable) {
    return false;
  }

  const conflict = await hasBookingConflict(id_angajat, startDate, endDate);
  if (conflict) {
    return false;
  }

  return true;
}

function generateCandidateSlots(
  dateInput,
  oraDeschidere,
  oraInchidere,
  stepMinutes = 15
) {
  const slots = [];
  const step = Number(stepMinutes);

  if (!Number.isFinite(step) || step <= 0) {
    throw new Error("Pas invalid pentru generarea sloturilor");
  }

  const start = combineDateAndTime(dateInput, oraDeschidere);
  const end = combineDateAndTime(dateInput, oraInchidere);

  if (start >= end) {
    return [];
  }

  let cursor = new Date(start);

  while (cursor < end) {
    slots.push(formatTimeHHMM(cursor));
    cursor = addMinutesToDate(cursor, step);
  }

  return slots;
}

module.exports = {
  isEmployeeAvailable,
  isDateInAllowedWindow,
  isEmployeeWorkingOnDate,
  getEmployeeWorkContext,
  getLocationSchedule,
  normalizeDateOnly,
  formatDateOnly,
  formatTimeHHMM,
  combineDateAndTime,
  addMinutesToDate,
  generateCandidateSlots,
};