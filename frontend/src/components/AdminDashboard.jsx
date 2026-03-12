import { useEffect, useMemo, useState } from "react";
import AdminTabs from "./admin/AdminTabs";
import ProgramariTab from "./admin/ProgramariTab";
import AngajatiTab from "./admin/AngajatiTab";
import IndisponibilitatiTab from "./admin/IndisponibilitatiTab";
import StocuriTab from "./admin/StocuriTab";
import ServiciiTab from "./admin/ServiciiTab";
import PlatiTab from "./admin/PlatiTab";
import {
  getEmployees,
  getBookings,
  getStocks,
  getServices,
  getUnavailability,
  getAvailableReceipts,
  getReceiptsHistory,
  searchClients as searchClientsApi,
  getEmployeesForService,
  getMultipleAvailableSlots,
  createUnavailability,
  deleteUnavailability,
  finalizeBooking,
  cancelBooking,
  issueReceipt,
  registerPayment,
  addProduct,
  updateStock,
  deactivateProduct,
  addEmployee,
  updateEmployee,
  setEmployeeInactive,
  addService,
  updateService,
  deactivateService,
  createClient,
  updateClient,
  createManualBooking,
} from "../services/adminApi";

function AdminDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState("programari");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [services, setServices] = useState([]);

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [unavailabilityList, setUnavailabilityList] = useState([]);
  const [loadingUnavailability, setLoadingUnavailability] = useState(false);

  const [newUnavailability, setNewUnavailability] = useState({
    id_angajat: "",
    data_start: "",
    data_final: "",
    tip: "concediu",
    motiv: "",
  });

  const [availableReceipts, setAvailableReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentType, setPaymentType] = useState("Card");

  const [showReceiptsHistory, setShowReceiptsHistory] = useState(false);
  const [receiptsHistory, setReceiptsHistory] = useState([]);
  const [loadingReceiptsHistory, setLoadingReceiptsHistory] = useState(false);
  const [receiptsHistorySearch, setReceiptsHistorySearch] = useState("");

  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    denumire_produs: "",
    unitate_masura: "",
    cantitate: "",
  });

  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockValue, setEditingStockValue] = useState("");

  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    nume: "",
    prenume: "",
    telefon: "",
    email: "",
    specializare: "",
    salariu: "",
    data_start_program: "",
    data_nastere: "",
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState({
    nume: "",
    prenume: "",
    telefon: "",
    email: "",
    specializare: "",
    salariu: "",
    data_start_program: "",
    data_nastere: "",
  });

  const [serviceSearch, setServiceSearch] = useState("");
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newService, setNewService] = useState({
    denumire_serviciu: "",
    pret: "",
    durata_minute: "",
  });

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingService, setEditingService] = useState({
    denumire_serviciu: "",
    pret: "",
    durata_minute: "",
  });

  const [showManualBookingForm, setShowManualBookingForm] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    nume: "",
    prenume: "",
    telefon: "",
    data_nasterii: "",
  });

  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClient, setEditingClient] = useState({
    nume: "",
    prenume: "",
    telefon: "",
    data_nasterii: "",
    email: "",
  });

  const [manualBooking, setManualBooking] = useState({
    id_serviciu: "",
    id_angajat: "",
    data: "",
    ora: "",
    observatii: "",
  });

  const [manualBookingSegments, setManualBookingSegments] = useState([]);
  const [availableManualSlots, setAvailableManualSlots] = useState([]);
  const [loadingManualSlots, setLoadingManualSlots] = useState(false);
  const [submittingManualBooking, setSubmittingManualBooking] = useState(false);

  const [manualBookingEmployees, setManualBookingEmployees] = useState([]);
  const [loadingManualBookingEmployees, setLoadingManualBookingEmployees] =
    useState(false);

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("toate");

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const todayForInput = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const maxBookingDate = useMemo(() => {
    const now = new Date();
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const yyyy = endOfNextMonth.getFullYear();
    const mm = String(endOfNextMonth.getMonth() + 1).padStart(2, "0");
    const dd = String(endOfNextMonth.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const formatDateOnly = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("ro-RO");
  };

  const formatDateForInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("ro-RO");
  };

  const formatTimeHHMM = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const isFutureDate = (dateString) => {
    if (!dateString) return false;
    return dateString > todayForInput;
  };

  const getServiceById = (id) =>
    services.find((service) => String(service.id_serviciu) === String(id)) || null;

  const getEmployeeById = (id) =>
    manualBookingEmployees.find((emp) => String(emp.id_angajat) === String(id)) ||
    employees.find((emp) => String(emp.id_angajat) === String(id)) ||
    null;

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

  const manualBookingTotalPrice = useMemo(() => {
    return manualBookingSegments.reduce(
      (sum, segment) => sum + Number(segment.pret || 0),
      0
    );
  }, [manualBookingSegments]);

  const manualBookingTotalDuration = useMemo(() => {
    return manualBookingSegments.reduce(
      (sum, segment) => sum + Number(segment.durata_minute || 0),
      0
    );
  }, [manualBookingSegments]);

  const computedManualSchedule = useMemo(() => {
    if (
      manualBookingSegments.length === 0 ||
      !manualBooking.data ||
      !manualBooking.ora
    ) {
      return [];
    }

    const result = [];
    let cursor = buildLocalDate(manualBooking.data, manualBooking.ora);

    for (const segment of manualBookingSegments) {
      const start = new Date(cursor);
      const end = addMinutesToDate(start, Number(segment.durata_minute || 0));

      result.push({
        ...segment,
        start,
        end,
      });

      cursor = end;
    }

    return result;
  }, [manualBookingSegments, manualBooking.data, manualBooking.ora]);

  const filteredReceiptsHistory = useMemo(() => {
    const search = receiptsHistorySearch.trim().toLowerCase();

    if (!search) return receiptsHistory;

    return receiptsHistory.filter((item) => {
      const searchableText = `
        ${item.nr_chitanta || ""}
        ${item.id_programare || ""}
        ${item.nume_client || ""}
        ${item.prenume_client || ""}
        ${item.telefon_client || ""}
        ${item.tip_plata || ""}
        ${item.status_plata || ""}
        ${item.suma_totala || ""}
      `
        .toLowerCase()
        .trim();

      return searchableText.includes(search);
    });
  }, [receiptsHistory, receiptsHistorySearch]);

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) return employees;

    return employees.filter((emp) => {
      const searchableText = `
        ${emp.id_angajat || ""}
        ${emp.nume || ""}
        ${emp.prenume || ""}
        ${emp.telefon || ""}
        ${emp.email || ""}
        ${emp.specializare || ""}
        ${emp.salariu || ""}
        ${emp.activ ? "activ" : "inactiv"}
      `
        .toLowerCase()
        .trim();

      return searchableText.includes(search);
    });
  }, [employees, employeeSearch]);

  const filteredStocks = useMemo(() => {
    const search = stockSearch.trim().toLowerCase();

    if (!search) return stocks;

    return stocks.filter((stock) => {
      const searchableText = `
        ${stock.id_produs || ""}
        ${stock.id_stoc || ""}
        ${stock.denumire_produs || ""}
        ${stock.unitate_masura || ""}
        ${stock.cantitate || ""}
        ${stock.activ ? "activ" : "inactiv"}
      `
        .toLowerCase()
        .trim();

      return searchableText.includes(search);
    });
  }, [stocks, stockSearch]);

  const filteredServices = useMemo(() => {
    const search = serviceSearch.trim().toLowerCase();

    if (!search) return services;

    return services.filter((service) => {
      const searchableText = `
        ${service.id_serviciu || ""}
        ${service.denumire_serviciu || ""}
        ${service.pret || ""}
        ${service.durata_minute || ""}
        ${service.activ ? "activ" : "inactiv"}
      `
        .toLowerCase()
        .trim();

      return searchableText.includes(search);
    });
  }, [services, serviceSearch]);

  const resetManualBooking = () => {
    setClientSearch("");
    setClientResults([]);
    setSelectedClient(null);
    setShowNewClientForm(false);
    setCreatingClient(false);
    setNewClient({
      nume: "",
      prenume: "",
      telefon: "",
      data_nasterii: "",
    });
    setEditingClientId(null);
    setEditingClient({
      nume: "",
      prenume: "",
      telefon: "",
      data_nasterii: "",
      email: "",
    });
    setManualBooking({
      id_serviciu: "",
      id_angajat: "",
      data: "",
      ora: "",
      observatii: "",
    });
    setManualBookingSegments([]);
    setAvailableManualSlots([]);
    setManualBookingEmployees([]);
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployees(token);
      setEmployees(data);
    } catch (err) {
      setError(err.message);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await getBookings(token);
      setBookings(data);
    } catch (err) {
      setError(err.message);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      const data = await getStocks(token);
      setStocks(data);
    } catch (err) {
      setError(err.message);
      setStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  };

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const data = await getServices(token);
      setServices(data);
    } catch (err) {
      setError(err.message);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchUnavailability = async (employeeId) => {
    if (!employeeId) {
      setUnavailabilityList([]);
      return;
    }

    setLoadingUnavailability(true);

    try {
      const data = await getUnavailability(token, employeeId);
      setUnavailabilityList(data);
    } catch (err) {
      setError(err.message);
      setUnavailabilityList([]);
    } finally {
      setLoadingUnavailability(false);
    }
  };

  const fetchAvailableReceipts = async () => {
    setLoadingReceipts(true);

    try {
      const data = await getAvailableReceipts(token);
      setAvailableReceipts(data);
    } catch (err) {
      setError(err.message);
      setAvailableReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const fetchReceiptsHistory = async () => {
    setLoadingReceiptsHistory(true);

    try {
      const data = await getReceiptsHistory(token);
      setReceiptsHistory(data);
    } catch (err) {
      setError(err.message);
      setReceiptsHistory([]);
    } finally {
      setLoadingReceiptsHistory(false);
    }
  };

  useEffect(() => {
    clearMessages();
    fetchEmployees();
    fetchBookings();
    fetchStocks();
    fetchServices();
    fetchAvailableReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (activeTab !== "plati") {
      setShowReceiptsHistory(false);
      setReceiptsHistorySearch("");
    }

    if (activeTab !== "angajati") {
      setEmployeeSearch("");
    }

    if (activeTab !== "stocuri") {
      setStockSearch("");
    }

    if (activeTab !== "servicii") {
      setServiceSearch("");
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchUnavailability(selectedEmployeeId);
    } else {
      setUnavailabilityList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  useEffect(() => {
    const controller = new AbortController();

    const searchClients = async () => {
      const term = clientSearch.trim();

      if (term.length < 2) {
        setClientResults([]);
        setSearchingClients(false);
        return;
      }

      setSearchingClients(true);

      try {
        const data = await searchClientsApi(token, term, controller.signal);
        setError("");
        setClientResults(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setClientResults([]);
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingClients(false);
        }
      }
    };

    const timer = setTimeout(searchClients, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clientSearch, token]);

  useEffect(() => {
    const fetchManualBookingEmployees = async () => {
      if (!manualBooking.id_serviciu || !user?.id_locatie) {
        setManualBookingEmployees([]);
        return;
      }

      setLoadingManualBookingEmployees(true);

      try {
        const data = await getEmployeesForService(
          user.id_locatie,
          manualBooking.id_serviciu
        );
        setManualBookingEmployees(data);
      } catch {
        setManualBookingEmployees([]);
      } finally {
        setLoadingManualBookingEmployees(false);
      }
    };

    fetchManualBookingEmployees();
  }, [manualBooking.id_serviciu, user?.id_locatie]);

  useEffect(() => {
    setManualBooking((prev) => ({
      ...prev,
      id_angajat: "",
    }));
    setAvailableManualSlots([]);
  }, [manualBooking.id_serviciu]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (manualBookingSegments.length === 0 || !manualBooking.data) {
        setAvailableManualSlots([]);
        return;
      }

      setLoadingManualSlots(true);

      try {
        const data = await getMultipleAvailableSlots(token, {
          data: manualBooking.data,
          segmente: manualBookingSegments.map((segment) => ({
            id_serviciu: Number(segment.id_serviciu),
            id_angajat: Number(segment.id_angajat),
          })),
        });

        setAvailableManualSlots(data);
      } catch {
        setAvailableManualSlots([]);
      } finally {
        setLoadingManualSlots(false);
      }
    };

    fetchSlots();
  }, [manualBookingSegments, manualBooking.data, token]);

  useEffect(() => {
    if (!manualBooking.data) {
      setManualBooking((prev) => ({
        ...prev,
        ora: "",
      }));
      return;
    }

    if (manualBooking.ora && !availableManualSlots.includes(manualBooking.ora)) {
      setManualBooking((prev) => ({
        ...prev,
        ora: "",
      }));
    }
  }, [availableManualSlots, manualBooking.ora, manualBooking.data]);

  const handleAddUnavailability = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!newUnavailability.id_angajat) {
      setError("Selectează un angajat.");
      return;
    }

    if (!newUnavailability.data_start || !newUnavailability.data_final) {
      setError("Selectează perioada indisponibilității.");
      return;
    }

    if (newUnavailability.data_start < todayForInput) {
      setError("Nu poți adăuga indisponibilități în trecut.");
      return;
    }

    if (newUnavailability.data_final < newUnavailability.data_start) {
      setError("Data de final nu poate fi mai mică decât data de start.");
      return;
    }

    try {
      const data = await createUnavailability(token, {
        id_angajat: Number(newUnavailability.id_angajat),
        data_start: newUnavailability.data_start,
        data_final: newUnavailability.data_final,
        tip: newUnavailability.tip,
        motiv: newUnavailability.motiv,
      });

      setMessage(data.message || "Indisponibilitate adăugată.");
      setNewUnavailability({
        id_angajat: "",
        data_start: "",
        data_final: "",
        tip: "concediu",
        motiv: "",
      });

      await fetchEmployees();

      if (selectedEmployeeId) {
        await fetchUnavailability(selectedEmployeeId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUnavailability = async (id) => {
    clearMessages();

    try {
      await deleteUnavailability(token, id);
      setUnavailabilityList((prev) =>
        prev.filter((item) => item.id_indisponibilitate !== id)
      );
      setMessage("Indisponibilitate ștearsă.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFinalizeBooking = async (idProgramare) => {
    clearMessages();

    try {
      const data = await finalizeBooking(token, idProgramare);
      setMessage(data.message || "Programare finalizată.");
      await fetchBookings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelBooking = async (idProgramare) => {
    clearMessages();

    const ok = window.confirm("Sigur vrei să anulezi această programare?");
    if (!ok) return;

    try {
      const data = await cancelBooking(token, idProgramare);
      setMessage(data.message || "Programare anulată.");
      await fetchBookings();
      await fetchAvailableReceipts();
      if (showReceiptsHistory) {
        await fetchReceiptsHistory();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleIssueReceipt = async (idProgramare) => {
    clearMessages();

    try {
      const data = await issueReceipt(token, idProgramare);

      setReceiptNumber(
        data?.chitanta?.nr_chitanta ? String(data.chitanta.nr_chitanta) : ""
      );
      setMessage(
        data?.chitanta?.nr_chitanta
          ? `Chitanță emisă. Număr: ${data.chitanta.nr_chitanta}`
          : "Chitanță emisă."
      );

      await fetchBookings();
      await fetchAvailableReceipts();
      if (showReceiptsHistory) {
        await fetchReceiptsHistory();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      const data = await registerPayment(token, {
        nr_chitanta: Number(receiptNumber),
        tip_plata: paymentType,
      });

      setMessage(data.message || "Plată înregistrată.");
      setReceiptNumber("");
      setPaymentType("Card");
      await fetchAvailableReceipts();
      if (showReceiptsHistory) {
        await fetchReceiptsHistory();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      const data = await addProduct(token, {
        denumire_produs: newProduct.denumire_produs,
        unitate_masura: newProduct.unitate_masura,
        cantitate: Number(newProduct.cantitate),
      });

      setMessage(data.message || "Produs adăugat.");
      setNewProduct({
        denumire_produs: "",
        unitate_masura: "",
        cantitate: "",
      });
      setShowAddProductForm(false);
      await fetchStocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditStock = (stock) => {
    clearMessages();
    setEditingStockId(stock.id_stoc);
    setEditingStockValue(String(stock.cantitate));
  };

  const cancelEditStock = () => {
    setEditingStockId(null);
    setEditingStockValue("");
  };

  const handleUpdateStock = async (id_stoc) => {
    clearMessages();

    try {
      const data = await updateStock(token, id_stoc, {
        cantitate: Number(editingStockValue),
      });

      setMessage(data.message || "Stoc actualizat.");
      cancelEditStock();
      await fetchStocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivateProduct = async (id_produs) => {
    clearMessages();

    const ok = window.confirm("Sigur vrei să dezactivezi acest produs?");
    if (!ok) return;

    try {
      const data = await deactivateProduct(token, id_produs);
      setMessage(data.message || "Produs dezactivat.");
      await fetchStocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    clearMessages();

    if (isFutureDate(newEmployee.data_start_program)) {
      setError("Data angajării nu poate fi în viitor.");
      return;
    }

    if (isFutureDate(newEmployee.data_nastere)) {
      setError("Data nașterii nu poate fi în viitor.");
      return;
    }

    try {
      const data = await addEmployee(token, {
        nume: newEmployee.nume.trim(),
        prenume: newEmployee.prenume.trim(),
        telefon: newEmployee.telefon.trim(),
        email: newEmployee.email.trim(),
        specializare: newEmployee.specializare.trim(),
        salariu: Number(newEmployee.salariu),
        data_start_program: newEmployee.data_start_program,
        data_nastere: newEmployee.data_nastere,
      });

      setMessage(data.message || "Angajat adăugat.");
      setNewEmployee({
        nume: "",
        prenume: "",
        telefon: "",
        email: "",
        specializare: "",
        salariu: "",
        data_start_program: "",
        data_nastere: "",
      });
      setShowAddEmployeeForm(false);
      await fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditEmployee = (emp) => {
    clearMessages();
    setEditingEmployeeId(emp.id_angajat);
    setEditingEmployee({
      nume: emp.nume || "",
      prenume: emp.prenume || "",
      telefon: emp.telefon || "",
      email: emp.email || "",
      specializare: emp.specializare || "",
      salariu: emp.salariu ?? "",
      data_start_program: formatDateForInput(emp.data_start_program),
      data_nastere: formatDateForInput(emp.data_nastere),
    });
  };

  const cancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEditingEmployee({
      nume: "",
      prenume: "",
      telefon: "",
      email: "",
      specializare: "",
      salariu: "",
      data_start_program: "",
      data_nastere: "",
    });
  };

  const handleUpdateEmployee = async (id_angajat) => {
    clearMessages();

    if (isFutureDate(editingEmployee.data_start_program)) {
      setError("Data angajării nu poate fi în viitor.");
      return;
    }

    if (isFutureDate(editingEmployee.data_nastere)) {
      setError("Data nașterii nu poate fi în viitor.");
      return;
    }

    try {
      const data = await updateEmployee(token, id_angajat, {
        nume: editingEmployee.nume.trim(),
        prenume: editingEmployee.prenume.trim(),
        telefon: editingEmployee.telefon.trim(),
        email: editingEmployee.email.trim(),
        specializare: editingEmployee.specializare.trim(),
        salariu: Number(editingEmployee.salariu),
        data_start_program: editingEmployee.data_start_program,
        data_nastere: editingEmployee.data_nastere,
      });

      setMessage(data.message || "Angajat actualizat.");
      cancelEditEmployee();
      await fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetEmployeeInactive = async (id_angajat) => {
    clearMessages();

    const ok = window.confirm("Sigur vrei să setezi acest angajat ca inactiv?");
    if (!ok) return;

    try {
      const data = await setEmployeeInactive(token, id_angajat);
      setMessage(data.message || "Angajat setat inactiv.");
      await fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      const data = await addService(token, {
        denumire_serviciu: newService.denumire_serviciu.trim(),
        pret: Number(newService.pret),
        durata_minute: Number(newService.durata_minute),
      });

      setMessage(data.message || "Serviciu adăugat.");
      setNewService({
        denumire_serviciu: "",
        pret: "",
        durata_minute: "",
      });
      setShowAddServiceForm(false);
      await fetchServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditService = (service) => {
    clearMessages();
    setEditingServiceId(service.id_serviciu);
    setEditingService({
      denumire_serviciu: service.denumire_serviciu || "",
      pret: service.pret ?? "",
      durata_minute: service.durata_minute ?? "",
    });
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setEditingService({
      denumire_serviciu: "",
      pret: "",
      durata_minute: "",
    });
  };

  const handleUpdateService = async (id_serviciu) => {
    clearMessages();

    try {
      const data = await updateService(token, id_serviciu, {
        denumire_serviciu: editingService.denumire_serviciu.trim(),
        pret: Number(editingService.pret),
        durata_minute: Number(editingService.durata_minute),
      });

      setMessage(data.message || "Serviciu actualizat.");
      cancelEditService();
      await fetchServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivateService = async (id_serviciu) => {
    clearMessages();

    const ok = window.confirm("Sigur vrei să dezactivezi acest serviciu?");
    if (!ok) return;

    try {
      const data = await deactivateService(token, id_serviciu);
      setMessage(data.message || "Serviciu dezactivat.");
      await fetchServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateNewClient = async () => {
    clearMessages();

    if (
      !newClient.nume.trim() ||
      !newClient.prenume.trim() ||
      !newClient.telefon.trim()
    ) {
      setError("Completează nume, prenume și telefon pentru clientul nou.");
      return;
    }

    if (isFutureDate(newClient.data_nasterii)) {
      setError("Data nașterii nu poate fi în viitor.");
      return;
    }

    try {
      setCreatingClient(true);

      const data = await createClient(token, {
        nume: newClient.nume.trim(),
        prenume: newClient.prenume.trim(),
        telefon: newClient.telefon.trim(),
        data_nasterii: newClient.data_nasterii || null,
      });

      setSelectedClient(data.client);
      setClientSearch(
        `${data.client.nume || ""} ${data.client.prenume || ""} ${data.client.telefon || ""}`.trim()
      );
      setClientResults([data.client]);

      setNewClient({
        nume: "",
        prenume: "",
        telefon: "",
        data_nasterii: "",
      });

      setShowNewClientForm(false);
      setMessage(data.message || "Client nou adăugat și selectat.");
    } catch (err) {
      if (err.data?.client) {
        setSelectedClient(err.data.client);
        setClientSearch(
          `${err.data.client.nume || ""} ${err.data.client.prenume || ""} ${err.data.client.telefon || ""}`.trim()
        );
        setClientResults([err.data.client]);
      }
      setError(err.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const startEditClient = (client) => {
    clearMessages();
    setSelectedClient(client);
    setShowNewClientForm(false);
    setEditingClientId(client.id_client);
    setEditingClient({
      nume: client.nume || "",
      prenume: client.prenume || "",
      telefon: client.telefon || "",
      data_nasterii: formatDateForInput(client.data_nasterii),
      email: client.email || "",
    });
  };

  const cancelEditClient = () => {
    setEditingClientId(null);
    setEditingClient({
      nume: "",
      prenume: "",
      telefon: "",
      data_nasterii: "",
      email: "",
    });
  };

  const handleUpdateClient = async () => {
    clearMessages();

    if (
      !editingClientId ||
      !editingClient.nume.trim() ||
      !editingClient.prenume.trim() ||
      !editingClient.telefon.trim() ||
      !editingClient.data_nasterii
    ) {
      setError("Completează toate câmpurile obligatorii ale clientului.");
      return;
    }

    if (isFutureDate(editingClient.data_nasterii)) {
      setError("Data nașterii nu poate fi în viitor.");
      return;
    }

    try {
      const data = await updateClient(token, editingClientId, {
        nume: editingClient.nume.trim(),
        prenume: editingClient.prenume.trim(),
        telefon: editingClient.telefon.trim(),
        data_nasterii: editingClient.data_nasterii,
        email: editingClient.email.trim(),
      });

      setSelectedClient(data.client);
      setClientResults((prev) =>
        prev.map((client) =>
          Number(client.id_client) === Number(editingClientId)
            ? data.client
            : client
        )
      );
      setClientSearch(
        `${data.client.nume || ""} ${data.client.prenume || ""} ${data.client.telefon || ""}`.trim()
      );
      setMessage(data.message || "Client actualizat cu succes.");
      cancelEditClient();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddManualSegment = () => {
    clearMessages();

    if (!manualBooking.data) {
      setError("Selectează mai întâi data vizitei.");
      return;
    }

    if (!manualBooking.id_serviciu || !manualBooking.id_angajat) {
      setError("Selectează serviciul și angajatul.");
      return;
    }

    const service = getServiceById(manualBooking.id_serviciu);
    const employee = getEmployeeById(manualBooking.id_angajat);

    if (!service) {
      setError("Serviciul selectat este invalid.");
      return;
    }

    if (!employee) {
      setError("Angajatul selectat este invalid.");
      return;
    }

    const alreadyExists = manualBookingSegments.some(
      (segment) =>
        Number(segment.id_serviciu) === Number(service.id_serviciu) &&
        Number(segment.id_angajat) === Number(employee.id_angajat)
    );

    if (alreadyExists) {
      setError("Acest serviciu cu acest specialist a fost deja adăugat.");
      return;
    }

    setManualBookingSegments((prev) => [
      ...prev,
      {
        id_serviciu: Number(service.id_serviciu),
        id_angajat: Number(employee.id_angajat),
        denumire_serviciu: service.denumire_serviciu,
        durata_minute: Number(service.durata_minute || 0),
        pret: Number(service.pret || 0),
        nume_angajat: `${employee.nume} ${employee.prenume}`,
      },
    ]);

    setManualBooking((prev) => ({
      ...prev,
      id_serviciu: "",
      id_angajat: "",
      ora: "",
    }));
    setAvailableManualSlots([]);
    setManualBookingEmployees([]);
  };

  const handleRemoveManualSegment = (indexToRemove) => {
    clearMessages();

    setManualBookingSegments((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );

    setManualBooking((prev) => ({
      ...prev,
      ora: "",
    }));
    setAvailableManualSlots([]);
  };

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!selectedClient) {
      setError("Selectează un client din listă.");
      return;
    }

    if (manualBookingSegments.length === 0) {
      setError("Adaugă cel puțin un serviciu în programare.");
      return;
    }

    if (!manualBooking.data || !manualBooking.ora) {
      setError("Selectează data și ora de început.");
      return;
    }

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

      setMessage(data.message || "Programare manuală adăugată.");
      resetManualBooking();
      setShowManualBookingForm(false);
      await fetchBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingManualBooking(false);
    }
  };

  const selectedEmployeeName =
    employees.find((emp) => String(emp.id_angajat) === String(selectedEmployeeId)) ||
    null;

  const selectedManualService = services.find(
    (service) => String(service.id_serviciu) === String(manualBooking.id_serviciu)
  );

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
      if (item.nr_chitanta) {
        group.hasReceipt = true;
      }
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
      const matchesStatus =
        bookingStatusFilter === "toate" || booking.status === bookingStatusFilter;

      if (!matchesStatus) return false;
      if (!search) return true;

      const serviceText = booking.servicii
        .map(
          (item) =>
            `${item.denumire_serviciu} ${item.nume_angajat} ${item.prenume_angajat}`
        )
        .join(" ")
        .toLowerCase();

      const searchableText = `
        ${booking.id_programare}
        #${booking.id_programare}
        ${booking.nume_client || ""}
        ${booking.prenume_client || ""}
        ${booking.telefon_client || ""}
        ${booking.status || ""}
        ${serviceText}
      `
        .toLowerCase()
        .trim();

      return searchableText.includes(search);
    });
  }, [bookingsGrouped, bookingSearch, bookingStatusFilter]);

  return (
    <div className="dashboard-container">
      <div className="topbar">
        <div>
          <h2>Dashboard Admin</h2>
          <div className="muted-text">
            {user?.email || "Administrator"} {user?.rol ? `• ${user.rol}` : ""}
          </div>
          <div className="muted-text">Locație: {user?.id_locatie ?? "-"}</div>
        </div>
        <button className="danger-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="panel">
        <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      {activeTab === "programari" && (
        <>
          <ProgramariTab
            clearMessages={clearMessages}
            showManualBookingForm={showManualBookingForm}
            setShowManualBookingForm={setShowManualBookingForm}
            resetManualBooking={resetManualBooking}
            bookingSearch={bookingSearch}
            setBookingSearch={setBookingSearch}
            bookingStatusFilter={bookingStatusFilter}
            setBookingStatusFilter={setBookingStatusFilter}
            handleManualBookingSubmit={handleManualBookingSubmit}
            clientSearch={clientSearch}
            setClientSearch={setClientSearch}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            showNewClientForm={showNewClientForm}
            setShowNewClientForm={setShowNewClientForm}
            newClient={newClient}
            setNewClient={setNewClient}
            todayForInput={todayForInput}
            handleCreateNewClient={handleCreateNewClient}
            creatingClient={creatingClient}
            searchingClients={searchingClients}
            clientResults={clientResults}
            manualBooking={manualBooking}
            setManualBooking={setManualBooking}
            maxBookingDate={maxBookingDate}
            manualBookingSegments={manualBookingSegments}
            handleRemoveManualSegment={handleRemoveManualSegment}
            manualBookingTotalDuration={manualBookingTotalDuration}
            manualBookingTotalPrice={manualBookingTotalPrice}
            loadingServices={loadingServices}
            services={services}
            loadingManualBookingEmployees={loadingManualBookingEmployees}
            manualBookingEmployees={manualBookingEmployees}
            handleAddManualSegment={handleAddManualSegment}
            loadingManualSlots={loadingManualSlots}
            availableManualSlots={availableManualSlots}
            selectedManualService={selectedManualService}
            computedManualSchedule={computedManualSchedule}
            formatTimeHHMM={formatTimeHHMM}
            submittingManualBooking={submittingManualBooking}
            loadingBookings={loadingBookings}
            filteredBookings={filteredBookings}
            formatDateTime={formatDateTime}
            handleFinalizeBooking={handleFinalizeBooking}
            handleCancelBooking={handleCancelBooking}
            handleIssueReceipt={handleIssueReceipt}
          />

          {selectedClient && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3 className="section-title">Client selectat</h3>
              <div className="muted-text">
                {selectedClient.nume} {selectedClient.prenume}
              </div>
              <div className="muted-text">
                Telefon: {selectedClient.telefon || "-"}
              </div>
              <div className="muted-text">
                Data nașterii: {formatDateOnly(selectedClient.data_nasterii)}
              </div>
              <div className="muted-text">
                Email: {selectedClient.email || "-"}
              </div>

              <div className="inline-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => startEditClient(selectedClient)}
                >
                  Editează clientul
                </button>
              </div>
            </div>
          )}

          {clientResults.length > 0 && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3 className="section-title">Rezultate clienți</h3>

              <div className="profiles-list">
                {clientResults.map((client) => (
                  <div key={client.id_client} className="profile-item">
                    <strong>
                      {client.nume} {client.prenume}
                    </strong>

                    <div className="muted-text">
                      Telefon: {client.telefon || "-"}
                    </div>

                    <div className="muted-text">
                      Data nașterii: {formatDateOnly(client.data_nasterii)}
                    </div>

                    <div className="muted-text">
                      Email: {client.email || "-"}
                    </div>

                    <div className="inline-actions" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientSearch(
                            `${client.nume || ""} ${client.prenume || ""} ${client.telefon || ""}`.trim()
                          );
                        }}
                      >
                        Selectează
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => startEditClient(client)}
                      >
                        Editează clientul
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingClientId && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3 className="section-title">Editează client</h3>

              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Nume"
                  value={editingClient.nume}
                  onChange={(e) =>
                    setEditingClient((prev) => ({
                      ...prev,
                      nume: e.target.value,
                    }))
                  }
                />

                <input
                  type="text"
                  placeholder="Prenume"
                  value={editingClient.prenume}
                  onChange={(e) =>
                    setEditingClient((prev) => ({
                      ...prev,
                      prenume: e.target.value,
                    }))
                  }
                />

                <input
                  type="text"
                  placeholder="Telefon"
                  value={editingClient.telefon}
                  onChange={(e) =>
                    setEditingClient((prev) => ({
                      ...prev,
                      telefon: e.target.value,
                    }))
                  }
                />

                <div>
                  <label className="field-label">Data nașterii</label>
                  <input
                    type="date"
                    max={todayForInput}
                    value={editingClient.data_nasterii}
                    onChange={(e) =>
                      setEditingClient((prev) => ({
                        ...prev,
                        data_nasterii: e.target.value,
                      }))
                    }
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email (doar dacă are cont)"
                  value={editingClient.email}
                  onChange={(e) =>
                    setEditingClient((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="inline-actions" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleUpdateClient}
                >
                  Salvează modificările
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={cancelEditClient}
                >
                  Renunță
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "angajati" && (
        <AngajatiTab
          showAddEmployeeForm={showAddEmployeeForm}
          setShowAddEmployeeForm={setShowAddEmployeeForm}
          employeeSearch={employeeSearch}
          setEmployeeSearch={setEmployeeSearch}
          handleAddEmployee={handleAddEmployee}
          newEmployee={newEmployee}
          setNewEmployee={setNewEmployee}
          todayForInput={todayForInput}
          loadingEmployees={loadingEmployees}
          filteredEmployees={filteredEmployees}
          editingEmployeeId={editingEmployeeId}
          editingEmployee={editingEmployee}
          setEditingEmployee={setEditingEmployee}
          handleUpdateEmployee={handleUpdateEmployee}
          cancelEditEmployee={cancelEditEmployee}
          startEditEmployee={startEditEmployee}
          handleSetEmployeeInactive={handleSetEmployeeInactive}
          formatDateOnly={formatDateOnly}
        />
      )}

      {activeTab === "indisponibilitati" && (
        <IndisponibilitatiTab
          handleAddUnavailability={handleAddUnavailability}
          newUnavailability={newUnavailability}
          setNewUnavailability={setNewUnavailability}
          employees={employees}
          todayForInput={todayForInput}
          selectedEmployeeId={selectedEmployeeId}
          setSelectedEmployeeId={setSelectedEmployeeId}
          selectedEmployeeName={selectedEmployeeName}
          loadingUnavailability={loadingUnavailability}
          unavailabilityList={unavailabilityList}
          formatDateOnly={formatDateOnly}
          handleDeleteUnavailability={handleDeleteUnavailability}
        />
      )}

      {activeTab === "stocuri" && (
        <StocuriTab
          showAddProductForm={showAddProductForm}
          setShowAddProductForm={setShowAddProductForm}
          stockSearch={stockSearch}
          setStockSearch={setStockSearch}
          handleAddProduct={handleAddProduct}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          loadingStocks={loadingStocks}
          filteredStocks={filteredStocks}
          editingStockId={editingStockId}
          editingStockValue={editingStockValue}
          setEditingStockValue={setEditingStockValue}
          handleUpdateStock={handleUpdateStock}
          cancelEditStock={cancelEditStock}
          startEditStock={startEditStock}
          handleDeactivateProduct={handleDeactivateProduct}
        />
      )}

      {activeTab === "servicii" && (
        <ServiciiTab
          showAddServiceForm={showAddServiceForm}
          setShowAddServiceForm={setShowAddServiceForm}
          serviceSearch={serviceSearch}
          setServiceSearch={setServiceSearch}
          handleAddService={handleAddService}
          newService={newService}
          setNewService={setNewService}
          loadingServices={loadingServices}
          filteredServices={filteredServices}
          editingServiceId={editingServiceId}
          editingService={editingService}
          setEditingService={setEditingService}
          handleUpdateService={handleUpdateService}
          cancelEditService={cancelEditService}
          startEditService={startEditService}
          handleDeactivateService={handleDeactivateService}
        />
      )}

      {activeTab === "plati" && (
        <PlatiTab
          clearMessages={clearMessages}
          showReceiptsHistory={showReceiptsHistory}
          setShowReceiptsHistory={setShowReceiptsHistory}
          fetchReceiptsHistory={fetchReceiptsHistory}
          setReceiptsHistorySearch={setReceiptsHistorySearch}
          handleRegisterPayment={handleRegisterPayment}
          receiptNumber={receiptNumber}
          setReceiptNumber={setReceiptNumber}
          loadingReceipts={loadingReceipts}
          availableReceipts={availableReceipts}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          formatDateTime={formatDateTime}
          receiptsHistorySearch={receiptsHistorySearch}
          loadingReceiptsHistory={loadingReceiptsHistory}
          filteredReceiptsHistory={filteredReceiptsHistory}
        />
      )}
    </div>
  );
}

export default AdminDashboard;