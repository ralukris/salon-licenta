import { useEffect, useMemo, useState } from "react";
import {
  getLocatii,
  createLocatie,
  updateLocatie,
  getAdministratori,
  createAdministrator,
  updateAdministrator,
  dezactiveazaAdministrator,
} from "../services/managerApi";

function ManagerDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState("locatii");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [locatii, setLocatii] = useState([]);
  const [administratori, setAdministratori] = useState([]);

  const [editingLocatieId, setEditingLocatieId] = useState(null);
  const [editingAdminId, setEditingAdminId] = useState(null);

  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const initialLocatieForm = {
    denumire: "",
    adresa: "",
    telefon: "",
    ora_deschidere: "09:00",
    ora_inchidere: "18:00",
    activ: true,
  };

  const initialAdminForm = {
    id_locatie: "",
    nume: "",
    prenume: "",
    email: "",
    parola: "",
    rol: "Receptie",
    activ: true,
  };

  const [locatieForm, setLocatieForm] = useState(initialLocatieForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setMessage("");

    try {
      const [locatiiData, administratoriData] = await Promise.all([
        getLocatii(token),
        getAdministratori(token),
      ]);

      if (Array.isArray(locatiiData)) {
        setLocatii(locatiiData);
      } else {
        setLocatii([]);
      }

      if (Array.isArray(administratoriData)) {
        setAdministratori(administratoriData);
      } else {
        setAdministratori([]);
      }
    } catch {
      setMessage("Eroare la încărcarea datelor managerului.");
    } finally {
      setLoading(false);
    }
  }

  const locatiiActive = useMemo(
    () => locatii.filter((loc) => loc.activ),
    [locatii]
  );

  function resetLocatieForm() {
    setLocatieForm(initialLocatieForm);
    setEditingLocatieId(null);
  }

  function resetAdminForm() {
    setAdminForm(initialAdminForm);
    setEditingAdminId(null);
    setShowAdminPassword(false);
  }

  function handleLocatieFormChange(e) {
    const { name, value, type, checked } = e.target;
    setLocatieForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleAdminFormChange(e) {
    const { name, value, type, checked } = e.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEditLocatie(locatie) {
    setActiveTab("locatii");
    setEditingLocatieId(locatie.id_locatie);
    setLocatieForm({
      denumire: locatie.denumire || "",
      adresa: locatie.adresa || "",
      telefon: locatie.telefon || "",
      ora_deschidere: String(locatie.ora_deschidere || "").slice(0, 5) || "09:00",
      ora_inchidere: String(locatie.ora_inchidere || "").slice(0, 5) || "18:00",
      activ: Boolean(locatie.activ),
    });
    setMessage("");
  }

  function startEditAdmin(admin) {
    setActiveTab("administratori");
    setEditingAdminId(admin.id_administrator);
    setAdminForm({
      id_locatie: admin.id_locatie ?? "",
      nume: admin.nume || "",
      prenume: admin.prenume || "",
      email: admin.email || "",
      parola: "",
      rol: admin.rol || "Receptie",
      activ: Boolean(admin.activ),
    });
    setShowAdminPassword(false);
    setMessage("");
  }

  async function handleSaveLocatie(e) {
    e.preventDefault();
    setMessage("");

    if (
      !locatieForm.denumire ||
      !locatieForm.adresa ||
      !locatieForm.ora_deschidere ||
      !locatieForm.ora_inchidere
    ) {
      setMessage(
        "Completează câmpurile obligatorii pentru locație: denumire, adresă și program."
      );
      return;
    }

    setLoading(true);

    try {
      let response;

      if (editingLocatieId) {
        response = await updateLocatie(token, editingLocatieId, locatieForm);
      } else {
        response = await createLocatie(token, locatieForm);
      }

      if (response?.error) {
        setMessage(response.error);
        return;
      }

      setMessage(
        response?.message ||
          (editingLocatieId
            ? "Locație actualizată cu succes."
            : "Locație adăugată cu succes.")
      );

      resetLocatieForm();
      await loadAll();
    } catch {
      setMessage("Eroare la salvarea locației.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAdmin(e) {
    e.preventDefault();
    setMessage("");

    if (
      !adminForm.nume ||
      !adminForm.prenume ||
      !adminForm.email ||
      !adminForm.rol
    ) {
      setMessage(
        "Completează câmpurile obligatorii pentru administrator: nume, prenume, email și rol."
      );
      return;
    }

    if (adminForm.rol === "Receptie" && !adminForm.id_locatie) {
      setMessage("Pentru rolul Receptie trebuie selectată o locație.");
      return;
    }

    if (!editingAdminId && !adminForm.parola) {
      setMessage("La crearea administratorului, parola este obligatorie.");
      return;
    }

    if (!editingAdminId && adminForm.parola.length < 6) {
      setMessage("Parola trebuie să aibă minim 6 caractere.");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (editingAdminId) {
        const payload = {
          id_locatie:
            adminForm.rol === "ManagerGeneral"
              ? null
              : Number(adminForm.id_locatie),
          nume: adminForm.nume,
          prenume: adminForm.prenume,
          email: adminForm.email,
          rol: adminForm.rol,
          activ: adminForm.activ,
        };

        response = await updateAdministrator(token, editingAdminId, payload);
      } else {
        const payload = {
          id_locatie:
            adminForm.rol === "ManagerGeneral"
              ? null
              : Number(adminForm.id_locatie),
          nume: adminForm.nume,
          prenume: adminForm.prenume,
          email: adminForm.email,
          parola: adminForm.parola,
          rol: adminForm.rol,
        };

        response = await createAdministrator(token, payload);
      }

      if (response?.error) {
        setMessage(response.error);
        return;
      }

      setMessage(
        response?.message ||
          (editingAdminId
            ? "Administrator actualizat cu succes."
            : "Administrator adăugat cu succes.")
      );

      resetAdminForm();
      await loadAll();
    } catch {
      setMessage("Eroare la salvarea administratorului.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateAdmin(admin) {
    const confirmed = window.confirm(
      `Sigur vrei să dezactivezi administratorul ${admin.nume} ${admin.prenume}?`
    );

    if (!confirmed) return;

    setMessage("");
    setLoading(true);

    try {
      const response = await dezactiveazaAdministrator(
        token,
        admin.id_administrator
      );

      if (response?.error) {
        setMessage(response.error);
        return;
      }

      setMessage(response?.message || "Administrator dezactivat.");
      await loadAll();
    } catch {
      setMessage("Eroare la dezactivarea administratorului.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-container">
      <div className="topbar">
        <div>
          <h2>Manager General</h2>
          <div className="muted-text">{user?.email}</div>
        </div>

        <button className="danger-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      {message && <div className="message info">{message}</div>}

      <div className="auth-switch" style={{ marginBottom: 20 }}>
        <button
          className={activeTab === "locatii" ? "primary-btn" : "secondary-btn"}
          onClick={() => setActiveTab("locatii")}
        >
          Locații
        </button>

        <button
          className={
            activeTab === "administratori" ? "primary-btn" : "secondary-btn"
          }
          onClick={() => setActiveTab("administratori")}
        >
          Administratori
        </button>
      </div>

      {loading && <div className="muted-text">Se încarcă...</div>}

      {activeTab === "locatii" && (
        <>
          <div className="panel">
            <h3 className="section-title">
              {editingLocatieId ? "Editează locație" : "Adaugă locație"}
            </h3>

            <form onSubmit={handleSaveLocatie} className="form-grid">
              <input
                type="text"
                name="denumire"
                placeholder="Denumire locație"
                value={locatieForm.denumire}
                onChange={handleLocatieFormChange}
                required
              />

              <input
                type="text"
                name="adresa"
                placeholder="Adresă"
                value={locatieForm.adresa}
                onChange={handleLocatieFormChange}
                required
              />

              <input
                type="text"
                name="telefon"
                placeholder="Telefon"
                value={locatieForm.telefon}
                onChange={handleLocatieFormChange}
              />

              <label className="field-label">Ora deschidere</label>
              <input
                type="time"
                name="ora_deschidere"
                value={locatieForm.ora_deschidere}
                onChange={handleLocatieFormChange}
                required
              />

              <label className="field-label">Ora închidere</label>
              <input
                type="time"
                name="ora_inchidere"
                value={locatieForm.ora_inchidere}
                onChange={handleLocatieFormChange}
                required
              />

              {editingLocatieId && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    name="activ"
                    checked={locatieForm.activ}
                    onChange={handleLocatieFormChange}
                  />
                  Locație activă
                </label>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {editingLocatieId ? "Salvează modificările" : "Adaugă locația"}
                </button>

                {editingLocatieId && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={resetLocatieForm}
                  >
                    Renunță
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="panel">
            <h3 className="section-title">Lista locațiilor</h3>

            {locatii.length === 0 ? (
              <p className="muted-text">Nu există locații înregistrate.</p>
            ) : (
              <div className="bookings-list">
                {locatii.map((locatie) => (
                  <div key={locatie.id_locatie} className="booking-item">
                    <div className="booking-header">
                      <div>
                        <strong>{locatie.denumire}</strong>
                        <div className="muted-text">{locatie.adresa}</div>
                        <div className="muted-text">
                          Telefon: {locatie.telefon || "-"}
                        </div>
                        <div className="muted-text">
                          Program: {String(locatie.ora_deschidere).slice(0, 5)} -{" "}
                          {String(locatie.ora_inchidere).slice(0, 5)}
                        </div>
                        <div className="muted-text">
                          Status: {locatie.activ ? "Activă" : "Inactivă"}
                        </div>
                      </div>

                      <div className="booking-actions">
                        <button
                          className="secondary-btn"
                          onClick={() => startEditLocatie(locatie)}
                        >
                          Editează
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "administratori" && (
        <>
          <div className="panel">
            <h3 className="section-title">
              {editingAdminId ? "Editează administrator" : "Adaugă administrator"}
            </h3>

            <form onSubmit={handleSaveAdmin} className="form-grid">
              <input
                type="text"
                name="nume"
                placeholder="Nume"
                value={adminForm.nume}
                onChange={handleAdminFormChange}
                required
              />

              <input
                type="text"
                name="prenume"
                placeholder="Prenume"
                value={adminForm.prenume}
                onChange={handleAdminFormChange}
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={adminForm.email}
                onChange={handleAdminFormChange}
                required
              />

              {!editingAdminId && (
                <div className="password-field">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    name="parola"
                    placeholder="Parola"
                    value={adminForm.parola}
                    onChange={handleAdminFormChange}
                    required
                  />
                  <button
                    type="button"
                    className="ghost-btn password-toggle"
                    onClick={() => setShowAdminPassword((prev) => !prev)}
                  >
                    {showAdminPassword ? "Ascunde" : "Arată"}
                  </button>
                </div>
              )}

              <label className="field-label">Rol</label>
              <select
                name="rol"
                value={adminForm.rol}
                onChange={handleAdminFormChange}
                required
              >
                <option value="Receptie">Receptie</option>
                <option value="ManagerGeneral">ManagerGeneral</option>
              </select>

              {adminForm.rol === "Receptie" && (
                <>
                  <label className="field-label">Locație</label>
                  <select
                    name="id_locatie"
                    value={adminForm.id_locatie}
                    onChange={handleAdminFormChange}
                    required
                  >
                    <option value="">Selectează locația</option>
                    {locatiiActive.map((locatie) => (
                      <option key={locatie.id_locatie} value={locatie.id_locatie}>
                        {locatie.denumire}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {editingAdminId && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    name="activ"
                    checked={adminForm.activ}
                    onChange={handleAdminFormChange}
                  />
                  Administrator activ
                </label>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {editingAdminId
                    ? "Salvează modificările"
                    : "Adaugă administrator"}
                </button>

                {editingAdminId && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={resetAdminForm}
                  >
                    Renunță
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="panel">
            <h3 className="section-title">Lista administratorilor</h3>

            {administratori.length === 0 ? (
              <p className="muted-text">Nu există administratori înregistrați.</p>
            ) : (
              <div className="bookings-list">
                {administratori.map((admin) => {
                  const isCurrentUser =
                    Number(admin.id_administrator) ===
                    Number(user?.id_administrator);

                  return (
                    <div key={admin.id_administrator} className="booking-item">
                      <div className="booking-header">
                        <div>
                          <strong>
                            {admin.nume} {admin.prenume}
                          </strong>
                          <div className="muted-text">{admin.email}</div>
                          <div className="muted-text">Rol: {admin.rol}</div>
                          <div className="muted-text">
                            Locație: {admin.denumire_locatie || "-"}
                          </div>
                          <div className="muted-text">
                            Status: {admin.activ ? "Activ" : "Inactiv"}
                          </div>
                          {isCurrentUser && (
                            <div className="muted-text">(Contul tău)</div>
                          )}
                        </div>

                        <div
                          className="booking-actions"
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          <button
                            className="secondary-btn"
                            onClick={() => startEditAdmin(admin)}
                          >
                            Editează
                          </button>

                          {!isCurrentUser && admin.activ && (
                            <button
                              className="danger-btn"
                              onClick={() => handleDeactivateAdmin(admin)}
                            >
                              Dezactivează
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ManagerDashboard;