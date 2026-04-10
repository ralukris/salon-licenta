import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");


    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare.");
        return;
      }

      setMessage(data.message || "Cererea a fost procesată.");
      setEmail("");
    } catch {
      setError("Eroare server.");
    }
  };

  return (
    <div className="app-shell">
      <div className="auth-container">
        <h2>Resetare parolă</h2>

        {message && <div className="message success">{message}</div>}
        {error && <div className="message error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            type="email"
            placeholder="Introdu emailul contului"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="primary-btn">
            Trimite cererea
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;