import { useState, useMemo } from "react";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  setEmployeeInactive,
  activateEmployee,
  getAngajatServicii,
  saveAngajatServicii,
} from "../services/adminApi";

export function useEmployees(token) {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [newEmployee, setNewEmployee] = useState({
    nume: "", prenume: "", telefon: "", email: "",
    specializare: "", salariu: "", data_start_program: "", data_nastere: "",
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState({
    nume: "", prenume: "", telefon: "", email: "",
    specializare: "", salariu: "", data_start_program: "", data_nastere: "",
  });

  const [angajatServiciiId, setAngajatServiciiId] = useState(null);
  const [angajatServiciiSelected, setAngajatServiciiSelected] = useState([]);
  const [loadingAngajatServicii, setLoadingAngajatServicii] = useState(false);

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();
    if (!search) return employees;
    return employees.filter((emp) => {
      const searchableText = `
        ${emp.id_angajat || ""} ${emp.nume || ""} ${emp.prenume || ""}
        ${emp.telefon || ""} ${emp.email || ""} ${emp.specializare || ""}
        ${emp.activ ? "activ" : "inactiv"}
      `.toLowerCase().trim();
      return searchableText.includes(search);
    });
  }, [employees, employeeSearch]);

  const formatDateForInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployees(token);
      setEmployees(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleAddEmployee = async (todayForInput) => {
    const isFutureDate = (d) => d > todayForInput;

    if (isFutureDate(newEmployee.data_start_program)) {
      throw new Error("Data angajării nu poate fi în viitor.");
    }
    if (isFutureDate(newEmployee.data_nastere)) {
      throw new Error("Data nașterii nu poate fi în viitor.");
    }

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

    setNewEmployee({
      nume: "", prenume: "", telefon: "", email: "",
      specializare: "", salariu: "", data_start_program: "", data_nastere: "",
    });
    setShowAddEmployeeForm(false);
    await fetchEmployees();
    return data;
  };

  const startEditEmployee = (emp) => {
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
      nume: "", prenume: "", telefon: "", email: "",
      specializare: "", salariu: "", data_start_program: "", data_nastere: "",
    });
  };

  const handleUpdateEmployee = async (id_angajat, todayForInput) => {
    const isFutureDate = (d) => d > todayForInput;

    if (isFutureDate(editingEmployee.data_start_program)) {
      throw new Error("Data angajării nu poate fi în viitor.");
    }
    if (isFutureDate(editingEmployee.data_nastere)) {
      throw new Error("Data nașterii nu poate fi în viitor.");
    }

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

    cancelEditEmployee();
    await fetchEmployees();
    return data;
  };

  const handleSetEmployeeInactive = async (id_angajat) => {
    const data = await setEmployeeInactive(token, id_angajat);
    await fetchEmployees();
    return data;
  };

  const handleActivateEmployee = async (id_angajat) => {
    const data = await activateEmployee(token, id_angajat);
    await fetchEmployees();
    return data;
  };

  const handleOpenServiciiAngajat = async (emp) => {
    setAngajatServiciiId(emp.id_angajat);
    setLoadingAngajatServicii(true);
    try {
      const data = await getAngajatServicii(token, emp.id_angajat);
      setAngajatServiciiSelected(data.map(Number));
    } finally {
      setLoadingAngajatServicii(false);
    }
  };

  const handleCloseServiciiAngajat = () => {
    setAngajatServiciiId(null);
    setAngajatServiciiSelected([]);
  };

  const handleToggleServiciu = (id_serviciu) => {
    setAngajatServiciiSelected((prev) =>
      prev.includes(Number(id_serviciu))
        ? prev.filter((id) => id !== Number(id_serviciu))
        : [...prev, Number(id_serviciu)]
    );
  };

  const handleSaveServiciiAngajat = async () => {
    const data = await saveAngajatServicii(token, angajatServiciiId, angajatServiciiSelected);
    handleCloseServiciiAngajat();
    return data;
  };

  return {
    employees, setEmployees,
    loadingEmployees,
    showAddEmployeeForm, setShowAddEmployeeForm,
    employeeSearch, setEmployeeSearch,
    newEmployee, setNewEmployee,
    editingEmployeeId,
    editingEmployee, setEditingEmployee,
    angajatServiciiId,
    angajatServiciiSelected,
    loadingAngajatServicii,
    filteredEmployees,
    fetchEmployees,
    handleAddEmployee,
    startEditEmployee,
    cancelEditEmployee,
    handleUpdateEmployee,
    handleSetEmployeeInactive,
    handleActivateEmployee,
    handleOpenServiciiAngajat,
    handleCloseServiciiAngajat,
    handleToggleServiciu,
    handleSaveServiciiAngajat,
  };
}