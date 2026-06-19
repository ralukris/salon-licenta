import { useEffect, useMemo, useState } from "react";
import AdminTabs from "./admin/AdminTabs";
import ProgramariTab from "./admin/ProgramariTab";
import AngajatiTab from "./admin/AngajatiTab";
import IndisponibilitatiTab from "./admin/IndisponibilitatiTab";
import StocuriTab from "./admin/StocuriTab";
import ServiciiTab from "./admin/ServiciiTab";
import PlatiTab from "./admin/PlatiTab";
import ClientiTab from "./admin/ClientiTab";
import logo from "../assets/raluca-logo.png";

import { useEmployees } from "../hooks/useEmployees";
import { useBookings } from "../hooks/useBookings";
import { useClients } from "../hooks/useClients";
import { useServices } from "../hooks/useServices";
import { useStocks } from "../hooks/useStocks";
import { useReceipts } from "../hooks/useReceipts";

import {
  getUnavailability,
  createUnavailability,
  deleteUnavailability,
  issueReceipt,
  cancelBooking,
  searchClients as searchClientsApi,
} from "../services/adminApi";

function AdminDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState("programari");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
  if (!message) return;
  const timer = setTimeout(() => setMessage(""), 3000);
  return () => clearTimeout(timer);
    }, [message]);

  useEffect(() => {
  if (!error) return;
  const timer = setTimeout(() => setError(""), 3000);
  return () => clearTimeout(timer);
   }, [error]);

  const clearMessages = () => { setMessage(""); setError(""); };

  const todayForInput = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const maxBookingDate = useMemo(() => {
    const now = new Date();
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    const yyyy = endOfNextMonth.getFullYear();
    const mm = String(endOfNextMonth.getMonth() + 1).padStart(2, "0");
    const dd = String(endOfNextMonth.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const formatDateOnly = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("ro-RO");
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

  const employeesHook = useEmployees(token);
  const servicesHook = useServices(token);
  const stocksHook = useStocks(token);
  const receiptsHook = useReceipts(token);
  const clientsHook = useClients(token);
  const bookingsHook = useBookings(token, user, servicesHook.services, employeesHook.employees);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [unavailabilityList, setUnavailabilityList] = useState([]);
  const [loadingUnavailability, setLoadingUnavailability] = useState(false);
  const [newUnavailability, setNewUnavailability] = useState({
    id_angajat: "", data_start: "", data_final: "", tip: "concediu", motiv: "",
  });

  const fetchUnavailability = async (employeeId) => {
    if (!employeeId) { setUnavailabilityList([]); return; }
    setLoadingUnavailability(true);
    try {
      const data = await getUnavailability(token, employeeId);
      setUnavailabilityList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUnavailability(false);
    }
  };

  const handleAddUnavailability = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!newUnavailability.id_angajat) { setError("Selectează un angajat."); return; }
    if (!newUnavailability.data_start || !newUnavailability.data_final) { setError("Selectează perioada."); return; }
    if (newUnavailability.data_start < todayForInput) { setError("Nu poți adăuga indisponibilități în trecut."); return; }
    if (newUnavailability.data_final < newUnavailability.data_start) { setError("Data de final nu poate fi mai mică decât data de start."); return; }
    try {
      const data = await createUnavailability(token, {
        id_angajat: Number(newUnavailability.id_angajat),
        data_start: newUnavailability.data_start,
        data_final: newUnavailability.data_final,
        tip: newUnavailability.tip,
        motiv: newUnavailability.motiv,
      });
      setMessage(data.message || "Indisponibilitate adăugată.");
      setNewUnavailability({ id_angajat: "", data_start: "", data_final: "", tip: "concediu", motiv: "" });
      await employeesHook.fetchEmployees();
      if (selectedEmployeeId) await fetchUnavailability(selectedEmployeeId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUnavailability = async (id) => {
    clearMessages();
    try {
      await deleteUnavailability(token, id);
      setUnavailabilityList((prev) => prev.filter((item) => item.id_indisponibilitate !== id));
      setMessage("Indisponibilitate ștearsă.");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    clearMessages();
    employeesHook.fetchEmployees();
    bookingsHook.fetchBookings();
    stocksHook.fetchStocks();
    servicesHook.fetchServices();
    clientsHook.fetchClients();
    receiptsHook.fetchAvailableReceipts();
  }, [token]);

  useEffect(() => {
    if (activeTab !== "plati") {
      receiptsHook.setShowReceiptsHistory(false);
      receiptsHook.setReceiptsHistorySearch("");
    }
    if (activeTab !== "angajati") employeesHook.setEmployeeSearch("");
    if (activeTab !== "stocuri") stocksHook.setStockSearch("");
    if (activeTab !== "servicii") servicesHook.setServiceSearch("");
    if (activeTab !== "clienti") {
      clientsHook.cancelEditClient();
      clientsHook.setClientsTabSearch("");
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedEmployeeId) fetchUnavailability(selectedEmployeeId);
    else setUnavailabilityList([]);
  }, [selectedEmployeeId]);

  useEffect(() => {
    const controller = new AbortController();
    const search = async () => {
      const term = bookingsHook.manualClientSearch.trim();
      if (term.length < 2) {
        bookingsHook.setManualClientResults([]);
        bookingsHook.setSearchingManualClients(false);
        return;
      }
      bookingsHook.setSearchingManualClients(true);
      try {
        const data = await searchClientsApi(token, term, controller.signal);
        bookingsHook.setManualClientResults(data);
        setError("");
      } catch (err) {
        if (!controller.signal.aborted) {
          bookingsHook.setManualClientResults([]);
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) bookingsHook.setSearchingManualClients(false);
      }
    };
    const timer = setTimeout(search, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [bookingsHook.manualClientSearch, token]);

  useEffect(() => {
    bookingsHook.fetchManualBookingEmployees(bookingsHook.manualBooking.id_serviciu);
  }, [bookingsHook.manualBooking.id_serviciu]);

  useEffect(() => {
    bookingsHook.setManualBooking((prev) => ({ ...prev, id_angajat: "" }));
  }, [bookingsHook.manualBooking.id_serviciu]);

  useEffect(() => {
    bookingsHook.fetchManualSlots(bookingsHook.manualBookingSegments, bookingsHook.manualBooking.data);
  }, [bookingsHook.manualBookingSegments, bookingsHook.manualBooking.data]);

  useEffect(() => {
    if (!bookingsHook.manualBooking.data) {
      bookingsHook.setManualBooking((prev) => ({ ...prev, ora: "" }));
      return;
    }
    if (bookingsHook.manualBooking.ora && !bookingsHook.availableManualSlots.includes(bookingsHook.manualBooking.ora)) {
      bookingsHook.setManualBooking((prev) => ({ ...prev, ora: "" }));
    }
  }, [bookingsHook.availableManualSlots, bookingsHook.manualBooking.ora, bookingsHook.manualBooking.data]);

  const handleFinalizeBooking = async (idProgramare) => {
    clearMessages();
    try {
      const data = await bookingsHook.handleFinalizeBooking(idProgramare);
      setMessage(data.message || "Programare finalizată.");
    } catch (err) { setError(err.message); }
  };

  const handleCancelBooking = async (idProgramare) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să anulezi această programare?");
    if (!ok) return;
    try {
      const data = await bookingsHook.handleCancelBooking(idProgramare);
      setMessage(data.message || "Programare anulată.");
      await receiptsHook.fetchAvailableReceipts();
    } catch (err) { setError(err.message); }
  };

  const handleIssueReceipt = async (idProgramare) => {
    clearMessages();
    try {
      const data = await issueReceipt(token, idProgramare);
      receiptsHook.setReceiptNumber(data?.chitanta?.nr_chitanta ? String(data.chitanta.nr_chitanta) : "");
      setMessage(data?.chitanta?.nr_chitanta ? `Chitanță emisă. Număr: ${data.chitanta.nr_chitanta}` : "Chitanță emisă.");
      await bookingsHook.fetchBookings();
      await receiptsHook.fetchAvailableReceipts();
    } catch (err) { setError(err.message); }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const data = await receiptsHook.handleRegisterPayment();
      setMessage(data.message || "Plată înregistrată.");
      if (receiptsHook.showReceiptsHistory) await receiptsHook.fetchReceiptsHistory();
    } catch (err) { setError(err.message); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const data = await stocksHook.handleAddProduct();
      setMessage(data.message || "Produs adăugat.");
    } catch (err) { setError(err.message); }
  };

  const handleUpdateStock = async (id_stoc) => {
    clearMessages();
    try {
      const data = await stocksHook.handleUpdateStock(id_stoc);
      setMessage(data.message || "Stoc actualizat.");
    } catch (err) { setError(err.message); }
  };

  const handleDeactivateProduct = async (id_produs) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să dezactivezi acest produs?");
    if (!ok) return;
    try {
      const data = await stocksHook.handleDeactivateProduct(id_produs);
      setMessage(data.message || "Produs dezactivat.");
    } catch (err) { setError(err.message); }
  };

  const handleActivateProduct = async (id_produs) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să reactivezi acest produs?");
    if (!ok) return;
    try {
      const data = await stocksHook.handleActivateProduct(id_produs);
      setMessage(data.message || "Produs reactivat.");
    } catch (err) { setError(err.message); }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const data = await employeesHook.handleAddEmployee(todayForInput);
      setMessage(data.message || "Angajat adăugat.");
    } catch (err) { setError(err.message); }
  };

  const handleUpdateEmployee = async (id_angajat) => {
    clearMessages();
    try {
      const data = await employeesHook.handleUpdateEmployee(id_angajat, todayForInput);
      setMessage(data.message || "Angajat actualizat.");
    } catch (err) { setError(err.message); }
  };

  const handleSetEmployeeInactive = async (id_angajat) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să setezi acest angajat ca inactiv?");
    if (!ok) return;
    try {
      const data = await employeesHook.handleSetEmployeeInactive(id_angajat);
      setMessage(data.message || "Angajat setat inactiv.");
    } catch (err) { setError(err.message); }
  };

  const handleActivateEmployee = async (id_angajat) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să reactivezi acest angajat?");
    if (!ok) return;
    try {
      const data = await employeesHook.handleActivateEmployee(id_angajat);
      setMessage(data.message || "Angajat reactivat.");
    } catch (err) { setError(err.message); }
  };

  const handleOpenServiciiAngajat = async (emp) => {
    clearMessages();
    try {
      await employeesHook.handleOpenServiciiAngajat(emp);
    } catch (err) { setError(err.message); }
  };

  const handleSaveServiciiAngajat = async () => {
    clearMessages();
    try {
      const data = await employeesHook.handleSaveServiciiAngajat();
      setMessage(data.message || "Servicii actualizate.");
    } catch (err) { setError(err.message); }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const data = await servicesHook.handleAddService();
      setMessage(data.message || "Serviciu adăugat.");
    } catch (err) { setError(err.message); }
  };

  const handleUpdateService = async (id_serviciu) => {
    clearMessages();
    try {
      const data = await servicesHook.handleUpdateService(id_serviciu);
      setMessage(data.message || "Serviciu actualizat.");
    } catch (err) { setError(err.message); }
  };

  const handleDeactivateService = async (id_serviciu) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să dezactivezi acest serviciu?");
    if (!ok) return;
    try {
      const data = await servicesHook.handleDeactivateService(id_serviciu);
      setMessage(data.message || "Serviciu dezactivat.");
    } catch (err) { setError(err.message); }
  };

  const handleActivateService = async (id_serviciu) => {
    clearMessages();
    const ok = window.confirm("Sigur vrei să reactivezi acest serviciu?");
    if (!ok) return;
    try {
      const data = await servicesHook.handleActivateService(id_serviciu);
      setMessage(data.message || "Serviciu reactivat.");
    } catch (err) { setError(err.message); }
  };

  const handleCreateNewClient = async () => {
    clearMessages();
    try {
      const data = await clientsHook.handleCreateClient(bookingsHook.newClient, todayForInput);
      await clientsHook.fetchClients();
      if (activeTab === "programari") {
        bookingsHook.setSelectedClient(data.client);
        bookingsHook.setManualClientSearch(
          `${data.client.nume || ""} ${data.client.prenume || ""} ${data.client.telefon || ""}`.trim()
        );
        bookingsHook.setManualClientResults([data.client]);
        setMessage(data.message || "Client nou adăugat și selectat.");
      } else {
        setMessage(data.message || "Client nou adăugat.");
      }
      bookingsHook.setNewClient({ nume: "", prenume: "", telefon: "", data_nasterii: "" });
      bookingsHook.setShowNewClientForm(false);
    } catch (err) {
      if (err.data?.client && activeTab === "programari") {
        bookingsHook.setSelectedClient(err.data.client);
        bookingsHook.setManualClientSearch(
          `${err.data.client.nume || ""} ${err.data.client.prenume || ""} ${err.data.client.telefon || ""}`.trim()
        );
        bookingsHook.setManualClientResults([err.data.client]);
      }
      setError(err.message);
    }
  };

  const handleUpdateClient = async () => {
    clearMessages();
    try {
      const data = await clientsHook.handleUpdateClient(todayForInput);
      setMessage(data.message || "Client actualizat cu succes.");
    } catch (err) { setError(err.message); }
  };

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const data = await bookingsHook.handleManualBookingSubmit();
      setMessage(data.message || "Programare manuală adăugată.");
    } catch (err) { setError(err.message); }
  };

  const handleAddManualSegment = () => {
    clearMessages();
    try {
      bookingsHook.handleAddManualSegment(todayForInput);
    } catch (err) { setError(err.message); }
  };

  const selectedEmployeeName = employeesHook.employees.find(
    (emp) => String(emp.id_angajat) === String(selectedEmployeeId)
  ) || null;

  const selectedManualService = servicesHook.services.find(
    (s) => String(s.id_serviciu) === String(bookingsHook.manualBooking.id_serviciu)
  );

  return (
    <div className="dashboard-container">
      <div style={{ textAlign: "center", paddingTop: "16px", marginBottom: "4px" }}>
        <img src={logo} alt="Raluca's Beauty Salon"
          style={{ width: "160px", height: "auto", opacity: 0.95 }} />
      </div>

      <div className="topbar">
        <div>
          <h2>Gestionare salon</h2>
          <div className="muted-text">
            {user?.email || "Administrator"} {user?.rol ? `• ${user.rol}` : ""}
          </div>
          <div className="muted-text">Locație: {user?.id_locatie ?? "-"}</div>
        </div>
        <button className="danger-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="panel">
        <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      {activeTab === "programari" && (
        <ProgramariTab
          clearMessages={clearMessages}
          showManualBookingForm={bookingsHook.showManualBookingForm}
          setShowManualBookingForm={bookingsHook.setShowManualBookingForm}
          resetManualBooking={bookingsHook.resetManualBooking}
          bookingSearch={bookingsHook.bookingSearch}
          setBookingSearch={bookingsHook.setBookingSearch}
          bookingStatusFilter={bookingsHook.bookingStatusFilter}
          setBookingStatusFilter={bookingsHook.setBookingStatusFilter}
          handleManualBookingSubmit={handleManualBookingSubmit}
          clientSearch={bookingsHook.manualClientSearch}
          setClientSearch={bookingsHook.setManualClientSearch}
          selectedClient={bookingsHook.selectedClient}
          setSelectedClient={bookingsHook.setSelectedClient}
          showNewClientForm={bookingsHook.showNewClientForm}
          setShowNewClientForm={bookingsHook.setShowNewClientForm}
          newClient={bookingsHook.newClient}
          setNewClient={bookingsHook.setNewClient}
          todayForInput={todayForInput}
          handleCreateNewClient={handleCreateNewClient}
          creatingClient={bookingsHook.creatingClient}
          searchingClients={bookingsHook.searchingManualClients}
          clientResults={bookingsHook.manualClientResults}
          manualBooking={bookingsHook.manualBooking}
          setManualBooking={bookingsHook.setManualBooking}
          maxBookingDate={maxBookingDate}
          manualBookingSegments={bookingsHook.manualBookingSegments}
          handleRemoveManualSegment={bookingsHook.handleRemoveManualSegment}
          manualBookingTotalDuration={bookingsHook.manualBookingTotalDuration}
          manualBookingTotalPrice={bookingsHook.manualBookingTotalPrice}
          loadingServices={servicesHook.loadingServices}
          services={servicesHook.services}
          loadingManualBookingEmployees={bookingsHook.loadingManualBookingEmployees}
          manualBookingEmployees={bookingsHook.manualBookingEmployees}
          handleAddManualSegment={handleAddManualSegment}
          loadingManualSlots={bookingsHook.loadingManualSlots}
          availableManualSlots={bookingsHook.availableManualSlots}
          selectedManualService={selectedManualService}
          computedManualSchedule={bookingsHook.computedManualSchedule}
          formatTimeHHMM={formatTimeHHMM}
          submittingManualBooking={bookingsHook.submittingManualBooking}
          loadingBookings={bookingsHook.loadingBookings}
          filteredBookings={bookingsHook.filteredBookings}
          formatDateTime={formatDateTime}
          handleFinalizeBooking={handleFinalizeBooking}
          handleCancelBooking={handleCancelBooking}
          handleIssueReceipt={handleIssueReceipt}
        />
      )}

      {activeTab === "clienti" && (
        <ClientiTab
          clientSearch={clientsHook.clientsTabSearch}
          setClientSearch={clientsHook.setClientsTabSearch}
          loadingClients={clientsHook.loadingClients}
          clientResults={clientsHook.filteredClients}
          showNewClientForm={bookingsHook.showNewClientForm}
          setShowNewClientForm={bookingsHook.setShowNewClientForm}
          newClient={bookingsHook.newClient}
          setNewClient={bookingsHook.setNewClient}
          todayForInput={todayForInput}
          handleCreateNewClient={handleCreateNewClient}
          creatingClient={bookingsHook.creatingClient}
          editingClientId={clientsHook.editingClientId}
          editingClient={clientsHook.editingClient}
          setEditingClient={clientsHook.setEditingClient}
          startEditClient={clientsHook.startEditClient}
          cancelEditClient={clientsHook.cancelEditClient}
          handleUpdateClient={handleUpdateClient}
          formatDateOnly={formatDateOnly}
        />
      )}

      {activeTab === "angajati" && (
        <AngajatiTab
          showAddEmployeeForm={employeesHook.showAddEmployeeForm}
          setShowAddEmployeeForm={employeesHook.setShowAddEmployeeForm}
          employeeSearch={employeesHook.employeeSearch}
          setEmployeeSearch={employeesHook.setEmployeeSearch}
          handleAddEmployee={handleAddEmployee}
          newEmployee={employeesHook.newEmployee}
          setNewEmployee={employeesHook.setNewEmployee}
          todayForInput={todayForInput}
          loadingEmployees={employeesHook.loadingEmployees}
          filteredEmployees={employeesHook.filteredEmployees}
          editingEmployeeId={employeesHook.editingEmployeeId}
          editingEmployee={employeesHook.editingEmployee}
          setEditingEmployee={employeesHook.setEditingEmployee}
          handleUpdateEmployee={handleUpdateEmployee}
          cancelEditEmployee={employeesHook.cancelEditEmployee}
          startEditEmployee={employeesHook.startEditEmployee}
          handleSetEmployeeInactive={handleSetEmployeeInactive}
          handleActivateEmployee={handleActivateEmployee}
          formatDateOnly={formatDateOnly}
          angajatServiciiId={employeesHook.angajatServiciiId}
          angajatServiciiSelected={employeesHook.angajatServiciiSelected}
          loadingAngajatServicii={employeesHook.loadingAngajatServicii}
          services={servicesHook.services}
          handleOpenServiciiAngajat={handleOpenServiciiAngajat}
          handleCloseServiciiAngajat={employeesHook.handleCloseServiciiAngajat}
          handleToggleServiciu={employeesHook.handleToggleServiciu}
          handleSaveServiciiAngajat={handleSaveServiciiAngajat}
        />
      )}

      {activeTab === "indisponibilitati" && (
        <IndisponibilitatiTab
          handleAddUnavailability={handleAddUnavailability}
          newUnavailability={newUnavailability}
          setNewUnavailability={setNewUnavailability}
          employees={employeesHook.employees}
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
          showAddProductForm={stocksHook.showAddProductForm}
          setShowAddProductForm={stocksHook.setShowAddProductForm}
          stockSearch={stocksHook.stockSearch}
          setStockSearch={stocksHook.setStockSearch}
          handleAddProduct={handleAddProduct}
          newProduct={stocksHook.newProduct}
          setNewProduct={stocksHook.setNewProduct}
          loadingStocks={stocksHook.loadingStocks}
          filteredStocks={stocksHook.filteredStocks}
          editingStockId={stocksHook.editingStockId}
          editingStockValue={stocksHook.editingStockValue}
          setEditingStockValue={stocksHook.setEditingStockValue}
          handleUpdateStock={handleUpdateStock}
          cancelEditStock={stocksHook.cancelEditStock}
          startEditStock={stocksHook.startEditStock}
          handleDeactivateProduct={handleDeactivateProduct}
          handleActivateProduct={handleActivateProduct}
        />
      )}

      {activeTab === "servicii" && (
        <ServiciiTab
          showAddServiceForm={servicesHook.showAddServiceForm}
          setShowAddServiceForm={servicesHook.setShowAddServiceForm}
          serviceSearch={servicesHook.serviceSearch}
          setServiceSearch={servicesHook.setServiceSearch}
          handleAddService={handleAddService}
          newService={servicesHook.newService}
          setNewService={servicesHook.setNewService}
          loadingServices={servicesHook.loadingServices}
          filteredServices={servicesHook.filteredServices}
          editingServiceId={servicesHook.editingServiceId}
          editingService={servicesHook.editingService}
          setEditingService={servicesHook.setEditingService}
          handleUpdateService={handleUpdateService}
          cancelEditService={servicesHook.cancelEditService}
          startEditService={servicesHook.startEditService}
          handleDeactivateService={handleDeactivateService}
          handleActivateService={handleActivateService}
        />
      )}

      {activeTab === "plati" && (
        <PlatiTab
          clearMessages={clearMessages}
          showReceiptsHistory={receiptsHook.showReceiptsHistory}
          setShowReceiptsHistory={receiptsHook.setShowReceiptsHistory}
          fetchReceiptsHistory={receiptsHook.fetchReceiptsHistory}
          setReceiptsHistorySearch={receiptsHook.setReceiptsHistorySearch}
          handleRegisterPayment={handleRegisterPayment}
          receiptNumber={receiptsHook.receiptNumber}
          setReceiptNumber={receiptsHook.setReceiptNumber}
          loadingReceipts={receiptsHook.loadingReceipts}
          availableReceipts={receiptsHook.availableReceipts}
          paymentType={receiptsHook.paymentType}
          setPaymentType={receiptsHook.setPaymentType}
          formatDateTime={formatDateTime}
          receiptsHistorySearch={receiptsHook.receiptsHistorySearch}
          loadingReceiptsHistory={receiptsHook.loadingReceiptsHistory}
          filteredReceiptsHistory={receiptsHook.filteredReceiptsHistory}
        />
      )}
    </div>
  );
}

export default AdminDashboard;