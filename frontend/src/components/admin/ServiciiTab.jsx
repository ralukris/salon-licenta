function ServiciiTab({
  showAddServiceForm,
  setShowAddServiceForm,
  serviceSearch,
  setServiceSearch,
  handleAddService,
  newService,
  setNewService,
  loadingServices,
  filteredServices,
  editingServiceId,
  editingService,
  setEditingService,
  handleUpdateService,
  cancelEditService,
  startEditService,
  handleDeactivateService,
}) {
  return (
    <div className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          Servicii salon
        </h3>

        <button
          className="primary-btn"
          onClick={() => setShowAddServiceForm((prev) => !prev)}
        >
          {showAddServiceForm ? "Închide formularul" : "Adaugă serviciu"}
        </button>
      </div>

      {showAddServiceForm ? (
        <form
          onSubmit={handleAddService}
          className="form-grid"
          style={{ marginBottom: 20 }}
        >
          <input
            type="text"
            placeholder="Denumire serviciu"
            value={newService.denumire_serviciu}
            onChange={(e) =>
              setNewService((prev) => ({
                ...prev,
                denumire_serviciu: e.target.value,
              }))
            }
            required
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Preț"
            value={newService.pret}
            onChange={(e) =>
              setNewService((prev) => ({
                ...prev,
                pret: e.target.value,
              }))
            }
            required
          />

          <input
            type="number"
            min="1"
            placeholder="Durată (minute)"
            value={newService.durata_minute}
            onChange={(e) =>
              setNewService((prev) => ({
                ...prev,
                durata_minute: e.target.value,
              }))
            }
            required
          />

          <button type="submit" className="primary-btn">
            Salvează serviciu
          </button>
        </form>
      ) : (
        <>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Caută după denumire, preț, durată sau ID"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
            />
          </div>

          {loadingServices ? (
            <p className="muted-text">Se încarcă serviciile...</p>
          ) : filteredServices.length === 0 ? (
            <p className="muted-text">
              Nu există servicii care să corespundă căutării.
            </p>
          ) : (
            <div className="profiles-list">
              {filteredServices.map((service) => (
                <div key={service.id_serviciu} className="profile-item">
                  {editingServiceId === service.id_serviciu ? (
                    <div className="form-grid">
                      <input
                        type="text"
                        placeholder="Denumire serviciu"
                        value={editingService.denumire_serviciu}
                        onChange={(e) =>
                          setEditingService((prev) => ({
                            ...prev,
                            denumire_serviciu: e.target.value,
                          }))
                        }
                        required
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preț"
                        value={editingService.pret}
                        onChange={(e) =>
                          setEditingService((prev) => ({
                            ...prev,
                            pret: e.target.value,
                          }))
                        }
                        required
                      />

                      <input
                        type="number"
                        min="1"
                        placeholder="Durată (minute)"
                        value={editingService.durata_minute}
                        onChange={(e) =>
                          setEditingService((prev) => ({
                            ...prev,
                            durata_minute: e.target.value,
                          }))
                        }
                        required
                      />

                      <div className="inline-actions">
                        <button
                          className="primary-btn"
                          type="button"
                          onClick={() => handleUpdateService(service.id_serviciu)}
                        >
                          Salvează
                        </button>

                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={cancelEditService}
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <strong>{service.denumire_serviciu}</strong>
                      <div className="muted-text">ID: {service.id_serviciu}</div>
                      <div className="muted-text">Preț: {service.pret} lei</div>
                      <div className="muted-text">
                        Durată: {service.durata_minute} min
                      </div>
                      <div className="muted-text">
                        Status: {service.activ ? "Activ" : "Inactiv"}
                      </div>

                      <div className="inline-actions" style={{ marginTop: 12 }}>
                        <button
                          className="secondary-btn"
                          onClick={() => startEditService(service)}
                        >
                          Editează
                        </button>

                        <button
                          className="danger-btn"
                          onClick={() =>
                            handleDeactivateService(service.id_serviciu)
                          }
                          disabled={!service.activ}
                        >
                          Dezactivează
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ServiciiTab;