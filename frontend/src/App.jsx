import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import BookingWizard from "./components/BookingWizard";
import AdminDashboard from "./components/AdminDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import logo from "./assets/raluca-logo.png";
const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [authView, setAuthView] = useState("client-login");
  // client-login | client-register | admin-login

  const [message, setMessage] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const [showClientPassword, setShowClientPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  // client login
  const [identificator, setIdentificator] = useState("");
  const [parola, setParola] = useState("");

  // admin login
  const [adminEmail, setAdminEmail] = useState("");
  const [adminParola, setAdminParola] = useState("");

  // register client
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");
  const [dataNasterii, setDataNasterii] = useState("");

  // client data
  const [profiles, setProfiles] = useState([]);
  const [programari, setProgramari] = useState([]);

  // add profile
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [newNume, setNewNume] = useState("");
  const [newPrenume, setNewPrenume] = useState("");
  const [newData, setNewData] = useState("");

  const resetClientAuthFields = () => {
    setIdentificator("");
    setParola("");
    setTelefon("");
    setEmail("");
    setNume("");
    setPrenume("");
    setDataNasterii("");
    setShowClientPassword(false);
  };

  const resetAdminFields = () => {
    setAdminEmail("");
    setAdminParola("");
    setShowAdminPassword(false);
  };

  const resetProfileForm = () => {
    setShowProfileForm(false);
    setNewNume("");
    setNewPrenume("");
    setNewData("");
  };

  const persistSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.tip);
    localStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.token);
    setRole(data.user.tip);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    setToken(null);
    setRole(null);
    setUser(null);
    setProfiles([]);
    setProgramari([]);
    setMessage("");

    resetClientAuthFields();
    resetAdminFields();
    resetProfileForm();

    setAuthView("client-login");
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!identificator || !parola) {
      setMessage("Completează email/telefon și parola.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificator, parola }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Eroare la login client");
        return;
      }

      persistSession(data);
      setMessage("Login client reușit.");
    } catch {
      setMessage("Eroare de conexiune cu serverul.");
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!adminEmail || !adminParola) {
      setMessage("Completează email și parola administratorului.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, parola: adminParola }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Eroare la login admin");
        return;
      }

      persistSession(data);
      setMessage("Login administrator reușit.");
    } catch {
      setMessage("Eroare de conexiune cu serverul.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!telefon || !email || !parola || !nume || !prenume || !dataNasterii) {
      setMessage("Completează toate câmpurile, inclusiv data nașterii.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/client/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefon,
          email,
          parola,
          nume,
          prenume,
          data_nasterii: dataNasterii,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Eroare la creare cont");
        return;
      }

      persistSession(data);
      setMessage("Cont client creat cu succes.");
    } catch {
      setMessage("Eroare de conexiune cu serverul.");
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!newNume || !newPrenume || !newData) {
      setMessage("Completează toate câmpurile pentru profil.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/client/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nume: newNume,
          prenume: newPrenume,
          data_nasterii: newData,
        }),
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        setMessage(data.error || "Eroare la creare profil");
        return;
      }

      setProfiles((prev) => [...prev, data]);
      resetProfileForm();
      setMessage("Profil adăugat cu succes.");
    } catch {
      setMessage("Eroare de conexiune cu serverul.");
    }
  };

  const fetchClientData = async () => {
    if (!token || role !== "CLIENT") return;

    try {
      const [profileRes, progRes] = await Promise.all([
        fetch(`${API_URL}/client/profiles`, {
       headers: { Authorization: `Bearer ${token}` },
       }),
       fetch(`${API_URL}/client/programari`, {
       headers: { Authorization: `Bearer ${token}` },
       }),
      ]);

      if (
        profileRes.status === 401 ||
        profileRes.status === 403 ||
        progRes.status === 401 ||
        progRes.status === 403
      ) {
        logout();
        return;
      }

      const profileData = await profileRes.json();
      const progData = await progRes.json();

      setProfiles(Array.isArray(profileData) ? profileData : []);
      setProgramari(Array.isArray(progData) ? progData : []);
    } catch {
      setMessage("Eroare la încărcarea datelor clientului.");
    }
  };

  const handleCancelBooking = async (idProgramare) => {
    if (!idProgramare) return;

    const confirmed = window.confirm(
      "Sigur vrei să anulezi această programare?"
    );

    if (!confirmed) return;

    setMessage("");
    setCancellingBookingId(idProgramare);

    try {
      const res = await fetch(
        `${API_URL}/client/programari/${idProgramare}/anulare`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        setMessage(data.error || "Eroare la anulare programare");
        return;
      }

      setMessage(data.message || "Programare anulată.");
      await fetchClientData();
    } catch {
      setMessage("Eroare de conexiune cu serverul.");
    } finally {
      setCancellingBookingId(null);
    }
  };

  useEffect(() => {
    fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  const groupedBookings = useMemo(() => {
    const groupedMap = new Map();

    for (const row of programari) {
      const bookingId = row.id_programare;

      if (!groupedMap.has(bookingId)) {
        groupedMap.set(bookingId, {
          id_programare: row.id_programare,
          status: row.status,
          observatii: row.observatii,
          data_creare: row.data_creare,
          denumire_locatie: row.denumire_locatie,
          id_client: row.id_client,
          nume_client: row.nume_client,
          prenume_client: row.prenume_client,
          segmente: [],
        });
      }

      groupedMap.get(bookingId).segmente.push({
        id_programare_serviciu: row.id_programare_serviciu,
        data_start: row.data_start,
        data_final: row.data_final,
        id_serviciu: row.id_serviciu,
        denumire_serviciu: row.denumire_serviciu,
        durata_minute: row.durata_minute,
        pret: row.pret,
        id_angajat: row.id_angajat,
        nume_angajat: row.nume_angajat,
        prenume_angajat: row.prenume_angajat,
      });
    }

    const groupedArray = Array.from(groupedMap.values()).map((booking) => {
      const sortedSegments = [...booking.segmente].sort(
        (a, b) => new Date(a.data_start) - new Date(b.data_start)
      );

      return {
        ...booking,
        segmente: sortedSegments,
        firstStart: sortedSegments[0]?.data_start || null,
        lastEnd: sortedSegments[sortedSegments.length - 1]?.data_final || null,
      };
    });

    return groupedArray.sort(
      (a, b) => new Date(b.firstStart || 0) - new Date(a.firstStart || 0)
    );
  }, [programari]);

  const getStatusBadgeClass = (status) => {
    if (status === "Confirmata") return "status-badge status-confirmata";
    if (status === "Finalizata") return "status-badge status-finalizata";
    if (status === "Anulata") return "status-badge status-anulata";
    return "status-badge";
  };

   const renderFixedLogo = () => {
  if (!token || !role) return null;

  const isMobile = window.innerWidth <= 768;

  return (
    <div
      style={{
        position: isMobile ? "relative" : "fixed",
        top: isMobile ? "auto" : "18px",
        left: isMobile ? "auto" : "22px",
        zIndex: 1000,
        display: "flex",
        justifyContent: isMobile ? "center" : "flex-start",
        alignItems: "center",
        width: isMobile ? "100%" : "auto",
        marginBottom: isMobile ? "8px" : 0,
        pointerEvents: "none",
      }}
    >
      <img
        src={logo}
        alt="Raluca's Beauty Salon"
        style={{
          width: isMobile ? "120px" : "150px",
          maxWidth: isMobile ? "120px" : "150px",
          height: "auto",
          display: "block",
          opacity: 0.95,
        }}
      />
    </div>
  );
};

  const renderAuthPage = () => (
    <div className="app-shell">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
        }}
      >
        <div
          className="auth-container"
          style={{
            width: authView === "client-register" ? "min(760px, 92vw)" : undefined,
          }}
        >
          <h2>
            {authView === "client-login"
              ? "Login client"
              : authView === "client-register"
              ? "Creează cont client"
              : "Login administrator"}
          </h2>

          <div className="auth-switch">
            <button
              className={
                authView === "client-login" ? "primary-btn" : "secondary-btn"
              }
              onClick={() => {
                setAuthView("client-login");
                setMessage("");
              }}
            >
              Client
            </button>

            <button
              className={
                authView === "client-register"
                  ? "primary-btn"
                  : "secondary-btn"
              }
              onClick={() => {
                setAuthView("client-register");
                setMessage("");
              }}
            >
              Creează cont
            </button>

            <button
              className={
                authView === "admin-login" ? "primary-btn" : "secondary-btn"
              }
              onClick={() => {
                setAuthView("admin-login");
                setMessage("");
              }}
            >
              Admin
            </button>
          </div>

          {authView === "client-login" && (
            <form onSubmit={handleClientLogin} className="form-grid">
              <input
                type="text"
                placeholder="Email sau telefon"
                value={identificator}
                onChange={(e) => setIdentificator(e.target.value)}
                required
              />

              <div className="password-field">
                <input
                  type={showClientPassword ? "text" : "password"}
                  placeholder="Parola"
                  value={parola}
                  onChange={(e) => setParola(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ghost-btn password-toggle"
                  onClick={() => setShowClientPassword((prev) => !prev)}
                >
                  {showClientPassword ? "Ascunde" : "Arată"}
                </button>
              </div>

              <div style={{ marginTop: -4 }}>
                <Link className="muted-text" to="/forgot-password">
                  Ai uitat parola?
                </Link>
              </div>

              <button type="submit" className="primary-btn">
                Login client
              </button>
            </form>
          )}

          {authView === "client-register" && (
            <form
              onSubmit={handleRegister}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                alignItems: "end",
              }}
            >
              <input
                type="text"
                placeholder="Nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Prenume"
                value={prenume}
                onChange={(e) => setPrenume(e.target.value)}
                required
              />

              <div>
                <label className="field-label">Data nașterii</label>
                <input
                  type="date"
                  value={dataNasterii}
                  max={today}
                  onChange={(e) => setDataNasterii(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <input
                type="text"
                placeholder="Telefon"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="password-field">
                <input
                  type={showClientPassword ? "text" : "password"}
                  placeholder="Parola"
                  value={parola}
                  onChange={(e) => setParola(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ghost-btn password-toggle"
                  onClick={() => setShowClientPassword((prev) => !prev)}
                >
                  {showClientPassword ? "Ascunde" : "Arată"}
                </button>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ width: "100%" }}
                >
                  Creează cont
                </button>
              </div>
            </form>
          )}

          {authView === "admin-login" && (
            <form onSubmit={handleAdminLogin} className="form-grid">
              <input
                type="email"
                placeholder="Email administrator"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />

              <div className="password-field">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Parola"
                  value={adminParola}
                  onChange={(e) => setAdminParola(e.target.value)}
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

              <button type="submit" className="primary-btn">
                Login admin
              </button>
            </form>
          )}

          {message && <div className="message info">{message}</div>}
        </div>

        <img
          src={logo}
          alt="Raluca's Beauty Salon"
          style={{
            width: "220px",
            maxWidth: "70%",
            opacity: 0.95,
          }}
        />
      </div>
    </div>
  );

  const renderClientDashboard = () => (
    <div className="app-shell">
      <div className="dashboard-container">
        <div className="topbar">
          <div>
            <h2>Dashboard Client</h2>
            {user?.email && <div className="muted-text">{user.email}</div>}
          </div>
          <button className="danger-btn" onClick={logout}>
            Logout
          </button>
        </div>

        {message && <div className="message info">{message}</div>}

        <div className="panel">
          <h3 className="section-title">Profiluri</h3>

          {profiles.length === 0 ? (
            <p className="muted-text">Nu ai niciun profil adăugat.</p>
          ) : (
            <div className="profiles-list">
              {profiles.map((p) => (
                <div key={p.id_client} className="profile-item">
                  <strong>
                    {p.nume} {p.prenume}
                  </strong>
                  <div className="muted-text">
                    {p.data_nasterii
                      ? new Date(p.data_nasterii).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              className="secondary-btn"
              onClick={() => setShowProfileForm((v) => !v)}
            >
              {showProfileForm ? "Anulează" : "Adaugă profil"}
            </button>
          </div>

          {showProfileForm && (
            <form
              onSubmit={handleCreateProfile}
              className="form-grid"
              style={{ marginTop: 16 }}
            >
              <input
                type="text"
                placeholder="Nume"
                value={newNume}
                onChange={(e) => setNewNume(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Prenume"
                value={newPrenume}
                onChange={(e) => setNewPrenume(e.target.value)}
                required
              />

              <label className="field-label">Data nașterii</label>
              <input
                type="date"
                value={newData}
                max={today}
                onChange={(e) => setNewData(e.target.value)}
                required
              />

              <button type="submit" className="primary-btn">
                Salvează profil
              </button>
            </form>
          )}
        </div>

        <div className="panel">
          <h3 className="section-title">Programări</h3>

          {groupedBookings.length === 0 ? (
            <p className="muted-text">Nu ai programări încă.</p>
          ) : (
            <div className="bookings-list">
              {groupedBookings.map((booking) => {
                const isCancelled = booking.status === "Anulata";
                const isFinished = booking.status === "Finalizata";
                const canCancel = !isCancelled && !isFinished;

                return (
                  <div key={booking.id_programare} className="booking-item">
                    <div className="booking-header">
                      <div>
                        <strong>{booking.denumire_locatie}</strong>
                        <span className={getStatusBadgeClass(booking.status)}>
                          {booking.status}
                        </span>
                        <div className="muted-text">
                          {booking.nume_client} {booking.prenume_client}
                        </div>
                        {booking.firstStart && booking.lastEnd && (
                          <div className="muted-text">
                            {new Date(booking.firstStart).toLocaleString()} →{" "}
                            {new Date(booking.lastEnd).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="booking-actions">
                        <button
                          className="danger-btn"
                          onClick={() =>
                            handleCancelBooking(booking.id_programare)
                          }
                          disabled={
                            !canCancel ||
                            cancellingBookingId === booking.id_programare
                          }
                          style={{
                            opacity:
                              canCancel &&
                              cancellingBookingId !== booking.id_programare
                                ? 1
                                : 0.6,
                          }}
                        >
                          {cancellingBookingId === booking.id_programare
                            ? "Se anulează..."
                            : "Anulează programarea"}
                        </button>
                      </div>
                    </div>

                    <div className="booking-segments">
                      {booking.segmente.map((segment, index) => (
                        <div
                          key={segment.id_programare_serviciu}
                          className="booking-segment-card"
                        >
                          <div style={{ fontWeight: 600 }}>
                            {index + 1}. {segment.denumire_serviciu}
                          </div>
                          <div className="muted-text">
                            cu {segment.nume_angajat} {segment.prenume_angajat} •{" "}
                            {segment.durata_minute} min • {segment.pret} lei
                          </div>
                          <div className="muted-text">
                            {new Date(segment.data_start).toLocaleString()} →{" "}
                            {new Date(segment.data_final).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="wizard-wrapper">
          <BookingWizard
            token={token}
            profiles={profiles}
            onBookingCreated={fetchClientData}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderFixedLogo()}

      <Routes>
        <Route
          path="/"
          element={
            !token || !role ? (
              renderAuthPage()
            ) : role === "ADMIN" ? (
              <div className="app-shell">
                {user?.rol === "ManagerGeneral" ? (
                  <ManagerDashboard
                    token={token}
                    user={user}
                    onLogout={logout}
                  />
                ) : (
                  <AdminDashboard
                    token={token}
                    user={user}
                    onLogout={logout}
                  />
                )}
              </div>
            ) : (
              renderClientDashboard()
            )
          }
        />
        <Route
          path="/forgot-password"
          element={!token ? <ForgotPassword /> : <Navigate to="/" replace />}
        />
        <Route
          path="/reset-password/:token"
          element={!token ? <ResetPassword /> : <Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default App;