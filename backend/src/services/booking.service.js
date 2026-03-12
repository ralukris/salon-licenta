const db = require("../config/db");
const {
  isEmployeeAvailable,
  isDateInAllowedWindow,
  isEmployeeWorkingOnDate,
  getEmployeeWorkContext,
  getLocationSchedule,
  addMinutesToDate,
  combineDateAndTime,
  formatTimeHHMM,
} = require("./availability.service");

function toDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Dată invalidă");
  }

  return date;
}

function toSqlDateTime(dateInput) {
  const d = toDate(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function toDateOnlyString(dateInput) {
  const d = toDate(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getServiceById(id_serviciu) {
  const result = await db.query(
    `
    SELECT id_serviciu, durata_minute, activ, denumire_serviciu
    FROM servicii
    WHERE id_serviciu = $1
    LIMIT 1
    `,
    [id_serviciu]
  );

  if (result.rows.length === 0) {
    throw new Error(`Serviciu invalid: ${id_serviciu}`);
  }

  return result.rows[0];
}

async function employeeCanPerformService(id_angajat, id_serviciu) {
  const result = await db.query(
    `
    SELECT 1
    FROM angajat_servicii
    WHERE id_angajat = $1
      AND id_serviciu = $2
    LIMIT 1
    `,
    [id_angajat, id_serviciu]
  );

  return result.rows.length > 0;
}

async function hasClientBookingConflict(id_client, data_start, data_final) {
  const result = await db.query(
    `
    SELECT 1
    FROM programare_servicii ps
    JOIN programari p ON p.id_programare = ps.id_programare
    WHERE p.id_client = $1
      AND p.status IN ('Confirmata', 'Finalizata')
      AND ($2::timestamp < ps.data_final AND $3::timestamp > ps.data_start)
    LIMIT 1
    `,
    [id_client, data_start, data_final]
  );

  return result.rows.length > 0;
}

async function validateSegmentDefinition({ id_locatie, id_serviciu, id_angajat }) {
  if (!id_locatie || !id_serviciu || !id_angajat) {
    throw new Error("Segment invalid: lipsesc id_locatie / id_serviciu / id_angajat");
  }

  const serviciu = await getServiceById(id_serviciu);

  if (serviciu.activ === false) {
    throw new Error(`Serviciul ${id_serviciu} este inactiv`);
  }

  const durataMin = Number(serviciu.durata_minute);

  if (!Number.isFinite(durataMin) || durataMin <= 0) {
    throw new Error(`Durată invalidă pentru serviciul ${id_serviciu}`);
  }

  const angajat = await getEmployeeWorkContext(id_angajat);

  if (!angajat) {
    throw new Error(`Angajat invalid: ${id_angajat}`);
  }

  if (angajat.activ === false) {
    throw new Error(`Angajatul ${id_angajat} este inactiv`);
  }

  if (Number(angajat.id_locatie) !== Number(id_locatie)) {
    throw new Error(`Angajatul ${id_angajat} nu aparține locației selectate`);
  }

  if (!angajat.data_start_program) {
    throw new Error(`Angajatul ${id_angajat} nu are configurată data_start_program`);
  }

  const canPerform = await employeeCanPerformService(id_angajat, id_serviciu);

  if (!canPerform) {
    throw new Error(`Angajatul ${id_angajat} nu poate executa serviciul ${id_serviciu}`);
  }

  return {
    serviciu,
    angajat,
    durataMin,
  };
}

async function validateSegmentAtDateTime({
  id_locatie,
  id_serviciu,
  id_angajat,
  data_start,
}) {
  if (!data_start) {
    throw new Error("Lipsește data_start");
  }

  const parsedStart = toDate(data_start);

  if (!isDateInAllowedWindow(parsedStart)) {
    throw new Error("Programarea se poate face doar în luna curentă și luna următoare");
  }

  const now = new Date();
  if (parsedStart < now) {
    throw new Error("Nu poți face o programare în trecut");
  }

  const { durataMin, angajat } = await validateSegmentDefinition({
    id_locatie,
    id_serviciu,
    id_angajat,
  });

  const data_final = addMinutesToDate(parsedStart, durataMin);
  const locatie = await getLocationSchedule(id_locatie);

  if (!locatie) {
    throw new Error("Locație invalidă");
  }

  if (locatie.activ === false) {
    throw new Error("Locație inactivă");
  }

  const dayStart = combineDateAndTime(parsedStart, locatie.ora_deschidere);
  const dayEnd = combineDateAndTime(parsedStart, locatie.ora_inchidere);

  if (parsedStart < dayStart || data_final > dayEnd) {
    const od = String(locatie.ora_deschidere).slice(0, 5);
    const oi = String(locatie.ora_inchidere).slice(0, 5);
    throw new Error(`Programarea trebuie să fie în programul locației (${od} - ${oi})`);
  }

  if (!isEmployeeWorkingOnDate(angajat.data_start_program, parsedStart)) {
    throw new Error(`Angajatul ${id_angajat} nu lucrează în ziua selectată`);
  }

  const disponibil = await isEmployeeAvailable(
    id_angajat,
    toSqlDateTime(parsedStart),
    toSqlDateTime(data_final)
  );

  if (!disponibil) {
    throw new Error(`Angajatul ${id_angajat} nu este disponibil în intervalul selectat`);
  }

  return {
    data_start: parsedStart,
    data_final,
    durata_minute: durataMin,
  };
}

/**
 * Calculează sloturile disponibile pentru mai multe servicii consecutive.
 * segmente = [{ id_serviciu, id_angajat }, ...]
 */
async function getAvailableSlotsForSegments({
  id_locatie,
  data,
  segmente,
  stepMinutes = 15,
}) {
  if (!id_locatie) {
    throw new Error("Lipsește id_locatie");
  }

  if (!data) {
    throw new Error("Lipsește data");
  }

  if (!Array.isArray(segmente) || segmente.length === 0) {
    throw new Error("Segmente lipsă");
  }

  if (!isDateInAllowedWindow(data)) {
    return [];
  }

  const locatie = await getLocationSchedule(id_locatie);

  if (!locatie) {
    throw new Error("Locație invalidă");
  }

  if (locatie.activ === false) {
    throw new Error("Locație inactivă");
  }

  const validatedSegments = [];
  let totalDuration = 0;

  for (const segment of segmente) {
    const id_serviciu = Number(segment.id_serviciu);
    const id_angajat = Number(segment.id_angajat);

    if (!Number.isInteger(id_serviciu) || !Number.isInteger(id_angajat)) {
      throw new Error("Fiecare segment trebuie să conțină id_serviciu și id_angajat valide");
    }

    const validated = await validateSegmentDefinition({
      id_locatie,
      id_serviciu,
      id_angajat,
    });

    validatedSegments.push({
      id_serviciu,
      id_angajat,
      durata_minute: validated.durataMin,
    });

    totalDuration += validated.durataMin;
  }

  const openDate = combineDateAndTime(data, locatie.ora_deschidere);
  const closeDate = combineDateAndTime(data, locatie.ora_inchidere);
  const lastPossibleStart = new Date(closeDate.getTime() - totalDuration * 60000);

  if (lastPossibleStart < openDate) {
    return [];
  }

  const slots = [];
  let cursor = new Date(openDate);

  while (cursor <= lastPossibleStart) {
    let currentStart = new Date(cursor);
    let allValid = true;

    for (const segment of validatedSegments) {
      try {
        const validatedSegment = await validateSegmentAtDateTime({
          id_locatie,
          id_serviciu: segment.id_serviciu,
          id_angajat: segment.id_angajat,
          data_start: currentStart,
        });

        currentStart = validatedSegment.data_final;
      } catch {
        allValid = false;
        break;
      }
    }

    if (allValid) {
      slots.push(formatTimeHHMM(cursor));
    }

    cursor = addMinutesToDate(cursor, stepMinutes);
  }

  return slots;
}

/**
 * Creează o programare + segmentele aferente într-o tranzacție.
 * segmente = [{ id_serviciu, id_angajat, data_start }]
 */
async function createBooking({ id_client, id_locatie, observatii, segmente }) {
  if (!id_client || !id_locatie) {
    throw new Error("Lipsesc id_client sau id_locatie");
  }

  if (!Array.isArray(segmente) || segmente.length === 0) {
    throw new Error("Segmente lipsă");
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const locRes = await client.query(
      `
      SELECT id_locatie, ora_deschidere, ora_inchidere, activ
      FROM locatii
      WHERE id_locatie = $1
      LIMIT 1
      `,
      [id_locatie]
    );

    if (locRes.rows.length === 0) {
      throw new Error("Locație invalidă");
    }

    const locatie = locRes.rows[0];

    if (locatie.activ === false) {
      throw new Error("Locație inactivă");
    }

    const clientRes = await client.query(
      `
      SELECT id_client
      FROM clienti
      WHERE id_client = $1
      LIMIT 1
      `,
      [id_client]
    );

    if (clientRes.rows.length === 0) {
      throw new Error("Client invalid");
    }

    const progRes = await client.query(
      `
      INSERT INTO programari (id_client, id_locatie, status, observatii)
      VALUES ($1, $2, 'Confirmata', $3)
      RETURNING id_programare
      `,
      [id_client, id_locatie, observatii || null]
    );

    const id_programare = progRes.rows[0].id_programare;
    let previousSegmentEnd = null;
    let bookingDate = null;

    for (let index = 0; index < segmente.length; index++) {
      const s = segmente[index];
      const id_serviciu = Number(s.id_serviciu);
      const id_angajat = Number(s.id_angajat);
      const data_start = s.data_start;

      if (!id_serviciu || !id_angajat || !data_start) {
        throw new Error(
          `Segment invalid la poziția ${index + 1}: lipsesc id_serviciu / id_angajat / data_start`
        );
      }

      const validation = await validateSegmentAtDateTime({
        id_locatie,
        id_serviciu,
        id_angajat,
        data_start,
      });

      const currentSegmentDate = toDateOnlyString(validation.data_start);

      if (!bookingDate) {
        bookingDate = currentSegmentDate;
      } else if (currentSegmentDate !== bookingDate) {
        throw new Error(
          "Toate serviciile din aceeași programare trebuie să fie în aceeași zi"
        );
      }

      if (previousSegmentEnd) {
        if (validation.data_start.getTime() !== previousSegmentEnd.getTime()) {
          throw new Error(
            `Serviciile trebuie să fie consecutive, fără pauză, la poziția ${index + 1}`
          );
        }
      }

      const clientConflict = await hasClientBookingConflict(
        id_client,
        toSqlDateTime(validation.data_start),
        toSqlDateTime(validation.data_final)
      );

      if (clientConflict) {
        throw new Error(
          `Clientul are deja o altă programare care se suprapune la poziția ${index + 1}`
        );
      }

      previousSegmentEnd = validation.data_final;

      await client.query(
        `
        INSERT INTO programare_servicii
          (id_programare, id_serviciu, id_angajat, data_start, data_final)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          id_programare,
          id_serviciu,
          id_angajat,
          toSqlDateTime(validation.data_start),
          toSqlDateTime(validation.data_final),
        ]
      );
    }

    await client.query("COMMIT");

    return { id_programare };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  getAvailableSlotsForSegments,
  validateSegmentAtDateTime,
};