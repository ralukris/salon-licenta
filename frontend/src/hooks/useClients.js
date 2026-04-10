import { useState, useMemo } from "react";
import {
  getClients,
  createClient,
  updateClient,
  searchClients as searchClientsApi,
} from "../services/adminApi";

export function useClients(token) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsTabSearch, setClientsTabSearch] = useState("");

  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClient, setEditingClient] = useState({
    nume: "", prenume: "", telefon: "", data_nasterii: "", email: "",
  });

  const formatDateForInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const filteredClients = useMemo(() => {
    const search = clientsTabSearch.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) => {
      const searchableText = `
        ${client.id_client || ""} ${client.nume || ""}
        ${client.prenume || ""} ${client.telefon || ""}
        ${client.email || ""} ${client.data_nasterii || ""}
      `.toLowerCase().trim();
      return searchableText.includes(search);
    });
  }, [clients, clientsTabSearch]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const data = await getClients(token);
      setClients(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingClients(false);
    }
  };

  const startEditClient = (client) => {
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
      nume: "", prenume: "", telefon: "", data_nasterii: "", email: "",
    });
  };

  const handleUpdateClient = async (todayForInput) => {
    if (
      !editingClientId ||
      !editingClient.nume.trim() ||
      !editingClient.prenume.trim() ||
      !editingClient.telefon.trim() ||
      !editingClient.data_nasterii
    ) {
      throw new Error("Completează toate câmpurile obligatorii ale clientului.");
    }

    if (editingClient.data_nasterii > todayForInput) {
      throw new Error("Data nașterii nu poate fi în viitor.");
    }

    const data = await updateClient(token, editingClientId, {
      nume: editingClient.nume.trim(),
      prenume: editingClient.prenume.trim(),
      telefon: editingClient.telefon.trim(),
      data_nasterii: editingClient.data_nasterii,
      email: editingClient.email.trim(),
    });

    setClients((prev) =>
      prev.map((client) =>
        Number(client.id_client) === Number(editingClientId) ? data.client : client
      )
    );

    cancelEditClient();
    return data;
  };

  const handleCreateClient = async (newClient, todayForInput) => {
    if (!newClient.nume.trim() || !newClient.prenume.trim() || !newClient.telefon.trim()) {
      throw new Error("Completează nume, prenume și telefon pentru clientul nou.");
    }

    if (newClient.data_nasterii && newClient.data_nasterii > todayForInput) {
      throw new Error("Data nașterii nu poate fi în viitor.");
    }

    const data = await createClient(token, {
      nume: newClient.nume.trim(),
      prenume: newClient.prenume.trim(),
      telefon: newClient.telefon.trim(),
      data_nasterii: newClient.data_nasterii || null,
    });

    await fetchClients();
    return data;
  };

  const searchClients = async (term, signal) => {
    if (term.trim().length < 2) return [];
    return await searchClientsApi(token, term, signal);
  };

  return {
    clients, setClients,
    loadingClients,
    clientsTabSearch, setClientsTabSearch,
    editingClientId,
    editingClient, setEditingClient,
    filteredClients,
    fetchClients,
    startEditClient,
    cancelEditClient,
    handleUpdateClient,
    handleCreateClient,
    searchClients,
  };
}