function ClientiTab({
  clientSearch,
  setClientSearch,
  searchingClients,
  clientResults,
  selectedClient,
  setSelectedClient,
  showNewClientForm,
  setShowNewClientForm,
  newClient,
  setNewClient,
  todayForInput,
  handleCreateNewClient,
  creatingClient,
  editingClientId,
  editingClient,
  setEditingClient,
  startEditClient,
  cancelEditClient,
  handleUpdateClient,
  formatDateOnly,
}) {
  return (
    <div className="panel">
      <h3 className="section-title">Clienți</h3>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Caută după nume, prenume, telefon sau email"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setShowNewClientForm((prev) => !prev)}
        >
          {showNewClientForm ? "Anulează" : "Adaugă client nou"}
        </button>
      </div>

      {showNewClientForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h4 className="section-title">Client nou</h4>

          <div className="form-grid">
            <input
              type="text"
              placeholder="Nume"
              value={newClient.nume}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, nume: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Prenume"
              value={newClient.prenume}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, prenume: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Telefon"
              value={newClient.telefon}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, telefon: e.target.value }))
              }
            />

            <div>
              <label className="field-label">Data nașterii</label>
              <input
                type="date"
                max={todayForInput}
                value={newClient.data_nasterii}
                onChange={(e) =>
                  setNewClient((prev) => ({
                    ...prev,
                    data_nasterii: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="inline-actions" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleCreateNewClient}
              disabled={creatingClient}
            >
              {creatingClient ? "Se salvează..." : "Salvează clientul"}
            </button>
          </div>
        </div>
      )}

      {searchingClients && (
        <p className="muted-text">Se caută clienții...</p>
      )}

      {!searchingClients &&
        clientSearch.trim().length >= 2 &&
        clientResults.length === 0 && (
          <p className="muted-text">Nu s-au găsit clienți.</p>
        )}

      {clientResults.length > 0 && (
        <div className="profiles-list">
          {clientResults.map((client) => {
            const isSelected =
              Number(selectedClient?.id_client) === Number(client.id_client);

            return (
              <div key={client.id_client} className="profile-item">
                <strong>
                  {client.nume} {client.prenume}
                </strong>

                <div className="muted-text">
                  Telefon: {client.telefon || "-"}
                </div>

                <div className="muted-text">
                  Email: {client.email || "-"}
                </div>

                <div className="muted-text">
                  Data nașterii: {formatDateOnly(client.data_nasterii)}
                </div>

                <div className="inline-actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className={isSelected ? "primary-btn" : "secondary-btn"}
                    onClick={() => setSelectedClient(client)}
                  >
                    {isSelected ? "Client selectat" : "Selectează"}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => startEditClient(client)}
                  >
                    Editează
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingClientId && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h4 className="section-title">Editează client</h4>

          <div className="form-grid">
            <input
              type="text"
              placeholder="Nume"
              value={editingClient.nume}
              onChange={(e) =>
                setEditingClient((prev) => ({ ...prev, nume: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Prenume"
              value={editingClient.prenume}
              onChange={(e) =>
                setEditingClient((prev) => ({
                  ...prev,
                  prenume: e.target.value,
                }))
              }
            />

            <input
              type="text"
              placeholder="Telefon"
              value={editingClient.telefon}
              onChange={(e) =>
                setEditingClient((prev) => ({
                  ...prev,
                  telefon: e.target.value,
                }))
              }
            />

            <input
              type="email"
              placeholder="Email (dacă există cont)"
              value={editingClient.email}
              onChange={(e) =>
                setEditingClient((prev) => ({ ...prev, email: e.target.value }))
              }
            />

            <div>
              <label className="field-label">Data nașterii</label>
              <input
                type="date"
                max={todayForInput}
                value={editingClient.data_nasterii}
                onChange={(e) =>
                  setEditingClient((prev) => ({
                    ...prev,
                    data_nasterii: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="inline-actions" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleUpdateClient}
            >
              Salvează modificările
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={cancelEditClient}
            >
              Renunță
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientiTab;