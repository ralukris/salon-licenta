function AdminTabs({ activeTab, setActiveTab }) {
  return (
    <div className="admin-tabs">
      <button
        className={activeTab === "programari" ? "primary-btn" : "secondary-btn"}
        onClick={() => setActiveTab("programari")}
      >
        Programări
      </button>

      <button
        className={activeTab === "angajati" ? "primary-btn" : "secondary-btn"}
        onClick={() => setActiveTab("angajati")}
      >
        Angajați
      </button>

      <button
        className={
          activeTab === "indisponibilitati" ? "primary-btn" : "secondary-btn"
        }
        onClick={() => setActiveTab("indisponibilitati")}
      >
        Indisponibilități
      </button>

      <button
        className={activeTab === "stocuri" ? "primary-btn" : "secondary-btn"}
        onClick={() => setActiveTab("stocuri")}
      >
        Stocuri
      </button>

      <button
        className={activeTab === "servicii" ? "primary-btn" : "secondary-btn"}
        onClick={() => setActiveTab("servicii")}
      >
        Servicii
      </button>

      <button
        className={activeTab === "plati" ? "primary-btn" : "secondary-btn"}
        onClick={() => setActiveTab("plati")}
      >
        Plăți
      </button>
    </div>
  );
}

export default AdminTabs;