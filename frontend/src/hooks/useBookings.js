import { useState, useMemo } from "react";
import {
  getBookings,
  finalizeBooking,
  cancelBooking,
  issueReceipt,
  createManualBooking,
  getMultipleAvailableSlots,
  getAvailableEmployeesForDate,
} from "../services/adminApi";

export function useBookings(token, user, services, employees) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("toate");
  const [showManualBookingForm, setShowManualBookingForm] = useState(false);

  const [manualBooking, setManualBooking] = useState({
    id_serviciu: "", id_angajat: "", data: "", ora: "", observatii: "",
  });

  const [manualBookingSegments, setManualBookingSegments] = useState([]);
  const [availableManualSlots, setAvailableManualSlots] = useState([]);
  const [loadingManualSlots, setLoadingManualSlots] = useState(false);
  const [submittingManualBooking, setSubmittingManualBooking] = useState(false);
  const [manualBookingEmployees, setManualBookingEmployees] = useState([]);
  const [loadingManualBookingEmployees, setLoadingManualBookingEmployees] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [manualClientSearch, setManualClientSearch] = useState("");
  const [manualClientResults, setManualClientResults] = useState([]);
  const [searchingManualClients, setSearchingManualClients] = useState(false);

  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    nume: "", prenume: "", telefon: "", data_nasterii: "",
  });

  const buildLocalDate = (dateString, timeString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const [hour, minute] = timeString.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  };

  const addMinutesToDate = (date, minutes) =>
    new Date(date.getTime() + minutes * 60000);

  const toSqlDateTime = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const manualBookingTotalPrice = useMemo(() =>
    manualBookingSegments.reduce((sum, s) => sum + Number(s.pret || 0), 0),
    [manualBookingSegments]
  );

  const manualBookingTotalDuration = useMemo(() =>
    manualBookingSegments.reduce((sum, s) => sum + Number(s.durata_minute || 0), 0),
    [manualBookingSegments]
  );

  const computedManualSchedule = useMemo(() => {
    if (manualBookingSegments.length === 0 || !manualBooking.data || !manualBooking.ora) return [];
    const result = [];
    let cursor = buildLocalDate(manualBooking.data, manualBooking.ora);
    for (const segment of manualBookingSegments) {
      const start = new Date(cursor);
      const end = addMinutesToDate(start, Number(segment.durata_minute || 0));
      result.push({ ...segment, start, end });
      cursor = end;
    }
    return result;
  }, [manualBookingSegments, manualBooking.data, manualBooking.ora]);

  const bookingsGrouped = useMemo(() => {
    const map = new Map();
    for (const item of bookings) {
      const key = item.id_programare;
      if (!map.has(key)) {
        map.set(key, {
          id_programare: item.id_programare,
          id_locatie: item.id_locatie,
          status: item.status,
          observatii: item.observatii,
          data_creare: item.data_creare,
          denumire_locatie: item.denumire_locatie,
          id_client: item.id_client,
          nume_client: item.nume_client,
          prenume_client: item.prenume_client,
          telefon_client: item.telefon_client,
          servicii: [],
          total: 0,
          hasReceipt: Boolean(item.nr_chitanta),
        });
      }
      const group = map.get(key);
      group.servicii.push({
        id_programare_serviciu: item.id_programare_serviciu,
        data_start: item.data_start,
        data_final: item.data_final,
        id_serviciu: item.id_serviciu,
        denumire_serviciu: item.denumire_serviciu,
        durata_minute: item.durata_minute,
        pret: item.pret,
        id_angajat: item.id_angajat,
        nume_angajat: item.nume_angajat,
        prenume_angajat: item.prenume_angajat,
      });
      group.total += Number(item.pret || 0);
      if (item.nr_chitanta) group.hasReceipt = true;
    }
    return Array.from(map.values()).sort((a, b) => {
      const firstA = a.servicii[0]?.data_start || "";
      const firstB = b.servicii[0]?.data_start || "";
      return new Date(firstB) - new Date(firstA);
    });
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const search = bookingSearch.trim().toLowerCase();
    return bookingsGrouped.filter((booking) => {
      const matchesStatus = bookingStatusFilter === "toate" || booking.status === bookingStatusFilter;
      if (!matchesStatus) return false;
      if (!search) return true;
      const serviceText = booking.servicii
        .map((item) => `${item.denumire_serviciu} ${item.nume_angajat} ${item.prenume_angajat}`)
        .join(" ").toLowerCase();
      const searchableText = `
        ${booking.id_programare} #${booking.id_programare}
        ${booking.nume_client || ""} ${booking.prenume_client || ""}
        ${booking.telefon_client || ""} ${booking.status || ""} ${serviceText}
      `.toLowerCase().trim();
      return searchableText.includes(search);
    });
  }, [bookingsGrouped, bookingSearch, bookingStatusFilter]);

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await getBookings(token);
      setBookings(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleFinalizeBooking = async (idProgramare) => {
    const data = await finalizeBooking(token, idProgramare);
    await fetchBookings();
    return data;
  };

  const handleCancelBooking = async (idProgramare) => {
    const data = await cancelBooking(token, idProgramare);
    await fetchBookings();
    return data;
  };

  const handleIssueReceipt = async (idProgramare) => {
    const data = await issueReceipt(token, idProgramare);
    await fetchBookings();
    return data;
  };

  const resetManualBooking = () => {
    setManualClientSearch("");
    setManualClientResults([]);
    setSelectedClient(null);
    setShowNewClientForm(false);
    setCreatingClient(false);
    setNewClient({ nume: "", prenume: "", telefon: "", data_nasterii: "" });
    setManualBooking({ id_serviciu: "", id_angajat: "", data: "", ora: "", observatii: "" });
    setManualBookingSegments([]);
    setAvailableManualSlots([]);
    setManualBookingEmployees([]);
  };

  const fetchManualBookingEmployees = async (id_serviciu, data) => {
    if (!id_serviciu || !data || !user?.id_locatie) {
      setManualBookingEmployees([]);
      return;
    }
    setLoadingManualBookingEmployees(true);
    try {
      const employees = await getAvailableEmployeesForDate(user.id_locatie, id_serviciu, data);
      setManualBookingEmployees(employees);
    } finally {
      setLoadingManualBookingEmployees(false);
    }
  };

  const fetchManualSlots = async (segments, data) => {
    if (segments.length === 0 || !data) {
      setAvailableManualSlots([]);
      return;
    }
    setLoadingManualSlots(true);
    try {
      const result = await getMultipleAvailableSlots(token, {
        data,
        segmente: segments.map((s) => ({
          id_serviciu: Number(s.id_serviciu),
          id_angajat: Number(s.id_angajat),
        })),
      });
      setAvailableManualSlots(result);
    } finally {
      setLoadingManualSlots(false);
    }
  };

  const handleAddManualSegment = (todayForInput) => {
    if (!manualBooking.data) throw new Error("Selectează mai întâi data vizitei.");
    if (!manualBooking.id_serviciu || !manualBooking.id_angajat) throw new Error("Selectează serviciul și angajatul.");

    const service = services.find((s) => String(s.id_serviciu) === String(manualBooking.id_serviciu));
    const employee = manualBookingEmployees.find((e) => String(e.id_angajat) === String(manualBooking.id_angajat))
      || employees.find((e) => String(e.id_angajat) === String(manualBooking.id_angajat));

    if (!service) throw new Error("Serviciul selectat este invalid.");
    if (!employee) throw new Error("Angajatul selectat este invalid.");

    const alreadyExists = manualBookingSegments.some(
      (s) => Number(s.id_serviciu) === Number(service.id_serviciu) && Number(s.id_angajat) === Number(employee.id_angajat)
    );
    if (alreadyExists) throw new Error("Acest serviciu cu acest specialist a fost deja adăugat.");

    setManualBookingSegments((prev) => [...prev, {
      id_serviciu: Number(service.id_serviciu),
      id_angajat: Number(employee.id_angajat),
      denumire_serviciu: service.denumire_serviciu,
      durata_minute: Number(service.durata_minute || 0),
      pret: Number(service.pret || 0),
      nume_angajat: `${employee.nume} ${employee.prenume}`,
    }]);

    setManualBooking((prev) => ({ ...prev, id_serviciu: "", id_angajat: "", ora: "" }));
    setAvailableManualSlots([]);
    setManualBookingEmployees([]);
  };

  const handleRemoveManualSegment = (indexToRemove) => {
    setManualBookingSegments((prev) => prev.filter((_, i) => i !== indexToRemove));
    setManualBooking((prev) => ({ ...prev, ora: "" }));
    setAvailableManualSlots([]);
  };

  const handleManualBookingSubmit = async () => {
    if (!selectedClient) throw new Error("Selectează un client din listă.");
    if (manualBookingSegments.length === 0) throw new Error("Adaugă cel puțin un serviciu în programare.");
    if (!manualBooking.data || !manualBooking.ora) throw new Error("Selectează data și ora de început.");

    setSubmittingManualBooking(true);
    try {
      let cursor = buildLocalDate(manualBooking.data, manualBooking.ora);
      const segmente = manualBookingSegments.map((segment) => {
        const start = new Date(cursor);
        cursor = addMinutesToDate(start, Number(segment.durata_minute || 0));
        return {
          id_serviciu: Number(segment.id_serviciu),
          id_angajat: Number(segment.id_angajat),
          data_start: toSqlDateTime(start),
        };
      });

      const data = await createManualBooking(token, {
        id_client: Number(selectedClient.id_client),
        observatii: manualBooking.observatii.trim(),
        segmente,
      });

      resetManualBooking();
      setShowManualBookingForm(false);
      await fetchBookings();
      return data;
    } finally {
      setSubmittingManualBooking(false);
    }
  };

  return {
    bookings, loadingBookings,
    bookingSearch, setBookingSearch,
    bookingStatusFilter, setBookingStatusFilter,
    showManualBookingForm, setShowManualBookingForm,
    manualBooking, setManualBooking,
    manualBookingSegments,
    availableManualSlots,
    loadingManualSlots,
    submittingManualBooking,
    manualBookingEmployees,
    loadingManualBookingEmployees,
    selectedClient, setSelectedClient,
    manualClientSearch, setManualClientSearch,
    manualClientResults, setManualClientResults,
    searchingManualClients, setSearchingManualClients,
    showNewClientForm, setShowNewClientForm,
    creatingClient, setCreatingClient,
    newClient, setNewClient,
    manualBookingTotalPrice,
    manualBookingTotalDuration,
    computedManualSchedule,
    filteredBookings,
    fetchBookings,
    handleFinalizeBooking,
    handleCancelBooking,
    handleIssueReceipt,
    resetManualBooking,
    fetchManualBookingEmployees,
    fetchManualSlots,
    handleAddManualSegment,
    handleRemoveManualSegment,
    handleManualBookingSubmit,
  };
}