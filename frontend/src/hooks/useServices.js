import { useState, useMemo } from "react";
import {
  getServices,
  addService,
  updateService,
  deactivateService,
  activateService,
} from "../services/adminApi";

export function useServices(token) {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);

  const [newService, setNewService] = useState({
    denumire_serviciu: "", pret: "", durata_minute: "",
  });

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingService, setEditingService] = useState({
    denumire_serviciu: "", pret: "", durata_minute: "",
  });

  const filteredServices = useMemo(() => {
    const search = serviceSearch.trim().toLowerCase();
    if (!search) return services;
    return services.filter((service) => {
      const searchableText = `
        ${service.id_serviciu || ""} ${service.denumire_serviciu || ""}
        ${service.pret || ""} ${service.durata_minute || ""}
        ${service.activ ? "activ" : "inactiv"}
      `.toLowerCase().trim();
      return searchableText.includes(search);
    });
  }, [services, serviceSearch]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const data = await getServices(token);
      setServices(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingServices(false);
    }
  };

  const handleAddService = async () => {
    const data = await addService(token, {
      denumire_serviciu: newService.denumire_serviciu.trim(),
      pret: Number(newService.pret),
      durata_minute: Number(newService.durata_minute),
    });

    setNewService({ denumire_serviciu: "", pret: "", durata_minute: "" });
    setShowAddServiceForm(false);
    await fetchServices();
    return data;
  };

  const startEditService = (service) => {
    setEditingServiceId(service.id_serviciu);
    setEditingService({
      denumire_serviciu: service.denumire_serviciu || "",
      pret: service.pret ?? "",
      durata_minute: service.durata_minute ?? "",
    });
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setEditingService({ denumire_serviciu: "", pret: "", durata_minute: "" });
  };

  const handleUpdateService = async (id_serviciu) => {
    const data = await updateService(token, id_serviciu, {
      denumire_serviciu: editingService.denumire_serviciu.trim(),
      pret: Number(editingService.pret),
      durata_minute: Number(editingService.durata_minute),
    });

    cancelEditService();
    await fetchServices();
    return data;
  };

  const handleDeactivateService = async (id_serviciu) => {
    const data = await deactivateService(token, id_serviciu);
    await fetchServices();
    return data;
  };

  const handleActivateService = async (id_serviciu) => {
    const data = await activateService(token, id_serviciu);
    await fetchServices();
    return data;
  };

  return {
    services, setServices,
    loadingServices,
    serviceSearch, setServiceSearch,
    showAddServiceForm, setShowAddServiceForm,
    newService, setNewService,
    editingServiceId,
    editingService, setEditingService,
    filteredServices,
    fetchServices,
    handleAddService,
    startEditService,
    cancelEditService,
    handleUpdateService,
    handleDeactivateService,
    handleActivateService,
  };
}