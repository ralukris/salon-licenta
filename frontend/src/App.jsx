import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import BookingWizard from "./components/BookingWizard";
import AdminDashboard from "./components/AdminDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import ClientDashboard from "./components/ClientDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import logo from "./assets/raluca-logo.png";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [authView, setAuthView] = useState("client-login");
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

  const [identificator, setIdentificator] = useState("");
  const [parola, setParola] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminParola, setAdminParola] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");
  const [dataNasterii, setDataNasterii] = useState("");

  const [profiles, setProfiles] = useState([]);
  const [programari, setProgramari] = useState([]);

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
    setIdentificator("");
    setParola("");
    setAdminEmail("");
    setAdminParola("");
    setShowClientPassword(false);
    setShowAdminPassword(false);
    setAuthView("client-login");
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!identificator || !parola) { setMessage("Completează email/telefon și parola."); return; }
    try {
      const res = await fetch(`${API_URL}/auth/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificator, parola }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Eroare la autentificare client"); return; }
      persistSession(data);
      setMessage("Autentificare client reușită.");
    } catch { setMessage("Eroare de conexiune cu serverul."); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!adminEmail || !adminParola) { setMessage("Completează email și parola administratorului."); return; }
    try {
      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, parola: adminParola }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Eroare la autentificare administrator"); return; }
      persistSession(data);
      setMessage("Autentificare administrator reușită.");
    } catch { setMessage("Eroare de conexiune cu serverul."); }
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
        body: JSON.stringify({ telefon, email, parola, nume, prenume, data_nasterii: dataNasterii }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Eroare la creare cont"); return; }
      persistSession(data);
      setMessage("Cont client creat cu succes.");
    } catch { setMessage("Eroare de conexiune cu serverul."); }
  };

  const fetchClientData = async () => {
    if (!token || role !== "CLIENT") return;
    try {
      const [profileRes, progRes] = await Promise.all([
        fetch(`${API_URL}/client/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/client/programari`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (profileRes.status === 401 || profileRes.status === 403 || progRes.status === 401 || progRes.status === 403) {
        logout();
        return;
      }
      const profileData = await profileRes.json();
      const progData = await progRes.json();
      setProfiles(Array.isArray(profileData) ? profileData : []);
      setProgramari(Array.isArray(progData) ? progData : []);
    } catch { setMessage("Eroare la încărcarea datelor clientului."); }
  };

  const handleCancelBooking = async (idProgramare) => {
    if (!idProgramare) return;
    const confirmed = window.confirm("Sigur vrei să anulezi această programare?");
    if (!confirmed) return;
    setMessage("");
    setCancellingBookingId(idProgramare);
    try {
      const res = await fetch(`${API_URL}/client/programari/${idProgramare}/anulare`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) { logout(); return; }
      if (!res.ok) { setMessage(data.error || "Eroare la anulare programare"); return; }
      setMessage(data.message || "Programare anulată.");
      await fetchClientData();
    } catch { setMessage("Eroare de conexiune cu serverul."); }
    finally { setCancellingBookingId(null); }
  };

  const handleCreateProfile = async ({ nume, prenume, data_nasterii }) => {
    const res = await fetch(`${API_URL}/client/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nume, prenume, data_nasterii }),
    });
    const data = await res.json();
    if (res.status === 401 || res.status === 403) { logout(); return; }
    if (!res.ok) throw new Error(data.error || "Eroare la creare profil");
    setProfiles((prev) => [...prev, data]);
    setMessage("Profil adăugat cu succes.");
  };

  const handleUpdateProfile = async (id, { nume, prenume, data_nasterii }) => {
    const res = await fetch(`${API_URL}/client/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nume, prenume, data_nasterii }),
    });
    const data = await res.json();
    if (res.status === 401 || res.status === 403) { logout(); return; }
    if (!res.ok) throw new Error(data.error || "Eroare la actualizare profil");
    setProfiles((prev) => prev.map((p) => p.id_client === id ? data.profile : p));
    setMessage(data.message || "Profil actualizat cu succes.");
  };

  useEffect(() => {
    fetchClientData();
  }, [token, role]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const renderAuthPage = () => (
    <div className="app-shell">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" }}>
        <div
          className="auth-container"
          style={{ width: authView === "client-register" ? "min(760px, 92vw)" : undefined }}
        >
          <h2>
            {authView === "client-login" ? "Autentificare client"
              : authView === "client-register" ? "Creează cont client"
              : "Autentificare administrator"}
          </h2>

          <div className="auth-switch">
            <button
              className={authView === "client-login" ? "primary-btn" : "secondary-btn"}
              onClick={() => { setAuthView("client-login"); setMessage(""); }}
            >Client</button>
            <button
              className={authView === "client-register" ? "primary-btn" : "secondary-btn"}
              onClick={() => { setAuthView("client-register"); setMessage(""); }}
            >Creează cont</button>
            <button
              className={authView === "admin-login" ? "primary-btn" : "secondary-btn"}
              onClick={() => { setAuthView("admin-login"); setMessage(""); }}
            >Admin</button>
          </div>

          {authView === "client-login" && (
            <form onSubmit={handleClientLogin} className="form-grid">
              <input type="text" placeholder="Email sau telefon" value={identificator}
                onChange={(e) => setIdentificator(e.target.value)} required />
              <div className="password-field">
                <input
                  type={showClientPassword ? "text" : "password"}
                  placeholder="Parola" value={parola}
                  onChange={(e) => setParola(e.target.value)} required
                />
                <button type="button" className="ghost-btn password-toggle"
                  onClick={() => setShowClientPassword((prev) => !prev)}>
                  {showClientPassword ? "Ascunde" : "Arată"}
                </button>
              </div>
              <div style={{ marginTop: -4 }}>
                <Link className="muted-text" to="/forgot-password">Ai uitat parola?</Link>
              </div>
              <button type="submit" className="primary-btn">Autentificare client</button>
            </form>
          )}

          {authView === "client-register" && (
            <form onSubmit={handleRegister}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "end" }}>
              <input type="text" placeholder="Nume" value={nume}
                onChange={(e) => setNume(e.target.value)} required />
              <input type="text" placeholder="Prenume" value={prenume}
                onChange={(e) => setPrenume(e.target.value)} required />
              <div>
                <label className="field-label">Data nașterii</label>
                <input type="date" value={dataNasterii} max={today}
                  onChange={(e) => setDataNasterii(e.target.value)} required style={{ width: "100%" }} />
              </div>
              <input type="text" placeholder="Telefon" value={telefon}
                onChange={(e) => setTelefon(e.target.value)} required />
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <div className="password-field">
                <input
                  type={showClientPassword ? "text" : "password"}
                  placeholder="Parola" value={parola}
                  onChange={(e) => setParola(e.target.value)} required
                />
                <button type="button" className="ghost-btn password-toggle"
                  onClick={() => setShowClientPassword((prev) => !prev)}>
                  {showClientPassword ? "Ascunde" : "Arată"}
                </button>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="primary-btn" style={{ width: "100%" }}>
                  Creează cont
                </button>
              </div>
            </form>
          )}

          {authView === "admin-login" && (
            <form onSubmit={handleAdminLogin} className="form-grid">
              <input type="email" placeholder="Email administrator" value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)} required />
              <div className="password-field">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Parola" value={adminParola}
                  onChange={(e) => setAdminParola(e.target.value)} required
                />
                <button type="button" className="ghost-btn password-toggle"
                  onClick={() => setShowAdminPassword((prev) => !prev)}>
                  {showAdminPassword ? "Ascunde" : "Arată"}
                </button>
              </div>
              <button type="submit" className="primary-btn">Autentificare administrator</button>
            </form>
          )}

          {message && <div className="message info">{message}</div>}
        </div>

        <img src={logo} alt="Raluca's Beauty Salon"
          style={{ width: "220px", maxWidth: "70%", opacity: 0.95 }} />
      </div>
    </div>
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          !token || !role ? (
            renderAuthPage()
          ) : role === "ADMIN" ? (
            <div className="app-shell">
              {user?.rol === "ManagerGeneral" ? (
                <ManagerDashboard token={token} user={user} onLogout={logout} />
              ) : (
                <AdminDashboard token={token} user={user} onLogout={logout} />
              )}
            </div>
          ) : (
            <div className="app-shell" style={{ paddingTop: 0 }}>
              <div className="dashboard-container">
                <div style={{ textAlign: "center", paddingTop: "16px", marginBottom: "4px" }}>
                  <img src={logo} alt="Raluca's Beauty Salon"
                    style={{ width: "160px", height: "auto", opacity: 0.95 }} />
                </div>
                {message && <div className="message info">{message}</div>}
                <ClientDashboard
                  token={token}
                  user={user}
                  profiles={profiles}
                  programari={programari}
                  onLogout={logout}
                  onFetchClientData={fetchClientData}
                  onCancelBooking={handleCancelBooking}
                  onCreateProfile={handleCreateProfile}
                  onUpdateProfile={handleUpdateProfile}
                  cancellingBookingId={cancellingBookingId}
                />
              </div>
            </div>
          )
        }
      />
      <Route path="/forgot-password"
        element={!token ? <ForgotPassword /> : <Navigate to="/" replace />} />
      <Route path="/reset-password/:token"
        element={!token ? <ResetPassword /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;