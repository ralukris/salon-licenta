import { useParams, Link } from "react-router-dom";
import { useState } from "react";

const API_BASE = "http://localhost:3000";

function ResetPassword() {
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare la resetare.");
        return;
      }

      setMessage(data.message || "Parola a fost schimbată.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Eroare server.");
    }
  };

  return (
    <div className="app-shell">
      <div className="auth-container">
        <h2>Setează parola nouă</h2>

        {message && <div className="message success">{message}</div>}
        {error && <div className="message error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            type="password"
            placeholder="Parolă nouă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirmă parola nouă"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className="primary-btn">
            Schimbă parola
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <Link className="muted-text" to="/">
            Înapoi la login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;