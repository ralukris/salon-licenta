function AngajatiTab({
  showAddEmployeeForm,
  setShowAddEmployeeForm,
  employeeSearch,
  setEmployeeSearch,
  handleAddEmployee,
  newEmployee,
  setNewEmployee,
  todayForInput,
  loadingEmployees,
  filteredEmployees,
  editingEmployeeId,
  editingEmployee,
  setEditingEmployee,
  handleUpdateEmployee,
  cancelEditEmployee,
  startEditEmployee,
  handleSetEmployeeInactive,
  formatDateOnly,
  angajatServiciiId,
  angajatServiciiSelected,
  loadingAngajatServicii,
  services,
  handleOpenServiciiAngajat,
  handleCloseServiciiAngajat,
  handleToggleServiciu,
  handleSaveServiciiAngajat,
  handleActivateEmployee,
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
          Angajați salon
        </h3>

        <button
          className="primary-btn"
          onClick={() => setShowAddEmployeeForm((prev) => !prev)}
        >
          {showAddEmployeeForm ? "Închide formularul" : "Adaugă angajat"}
        </button>
      </div>

      {showAddEmployeeForm ? (
        <form
          onSubmit={handleAddEmployee}
          className="form-grid"
          style={{ marginBottom: 20 }}
        >
          <input
            type="text"
            placeholder="Nume"
            value={newEmployee.nume}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, nume: e.target.value }))
            }
            required
          />

          <input
            type="text"
            placeholder="Prenume"
            value={newEmployee.prenume}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, prenume: e.target.value }))
            }
            required
          />

          <input
            type="text"
            placeholder="Telefon"
            value={newEmployee.telefon}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, telefon: e.target.value }))
            }
          />

          <input
            type="email"
            placeholder="Email"
            value={newEmployee.email}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, email: e.target.value }))
            }
          />

          <input
            type="text"
            placeholder="Specializare"
            value={newEmployee.specializare}
            onChange={(e) =>
              setNewEmployee((prev) => ({
                ...prev,
                specializare: e.target.value,
              }))
            }
            required
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Salariu"
            value={newEmployee.salariu}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, salariu: e.target.value }))
            }
            required
          />

          <div>
            <label className="muted-text">Data angajării</label>
            <input
              type="date"
              value={newEmployee.data_start_program}
              onChange={(e) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  data_start_program: e.target.value,
                }))
              }
              max={todayForInput}
              required
            />
          </div>

          <div>
            <label className="muted-text">Data nașterii</label>
            <input
              type="date"
              value={newEmployee.data_nastere}
              onChange={(e) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  data_nastere: e.target.value,
                }))
              }
              max={todayForInput}
              required
            />
          </div>

          <button type="submit" className="primary-btn">
            Salvează angajat
          </button>
        </form>
      ) : (
        <>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Caută după nume, prenume, telefon, email, specializare sau ID"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />
          </div>

          {loadingEmployees ? (
            <p className="muted-text">Se încarcă angajații...</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="muted-text">
              Nu există angajați care să corespundă căutării.
            </p>
          ) : (
            <div className="profiles-list">
              {filteredEmployees.map((emp) => (
                <div key={emp.id_angajat} className="profile-item">
                  {editingEmployeeId === emp.id_angajat ? (
                    <div className="form-grid">
                      <input
                        type="text"
                        placeholder="Nume"
                        value={editingEmployee.nume}
                        onChange={(e) =>
                          setEditingEmployee((prev) => ({
                            ...prev,
                            nume: e.target.value,
                          }))
                        }
                        required
                      />

                      <input
                        type="text"
                        placeholder="Prenume"
                        value={editingEmployee.prenume}
                        onChange={(e) =>
                          setEditingEmployee((prev) => ({
                            ...prev,
                            prenume: e.target.value,
                          }))
                        }
                        required
                      />

                      <input
                        type="text"
                        placeholder="Telefon"
                        value={editingEmployee.telefon}
                        onChange={(e) =>
                          setEditingEmployee((prev) => ({
                            ...prev,
                            telefon: e.target.value,
                          }))
                        }
                      />

                      <input
                        type="email"
                        placeholder="Email"
                        value={editingEmployee.email}
                        onChange={(e) =>
                          setEditingEmployee((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />

                      <input
                        type="text"
                        placeholder="Specializare"
                        value={editingEmployee.specializare}
                        onChange={(e) =>
                          setEditingEmployee((prev) => ({
                            ...prev,
                            specializare: e.target.value,
                          }))
                        }
                        required
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Salariu"
                        value={editingEmployee.salariu}
                        onChange={(e) =>
                          setEditingEmployee((prev) => ({
                            ...prev,
                            salariu: e.target.value,
                          }))
                        }
                        required
                      />

                      <div>
                        <label className="muted-text">Data angajării</label>
                        <input
                          type="date"
                          value={editingEmployee.data_start_program}
                          onChange={(e) =>
                            setEditingEmployee((prev) => ({
                              ...prev,
                              data_start_program: e.target.value,
                            }))
                          }
                          max={todayForInput}
                          required
                        />
                      </div>

                      <div>
                        <label className="muted-text">Data nașterii</label>
                        <input
                          type="date"
                          value={editingEmployee.data_nastere}
                          onChange={(e) =>
                            setEditingEmployee((prev) => ({
                              ...prev,
                              data_nastere: e.target.value,
                            }))
                          }
                          max={todayForInput}
                          required
                        />
                      </div>

                      <div className="inline-actions">
                        <button
                          className="primary-btn"
                          type="button"
                          onClick={() => handleUpdateEmployee(emp.id_angajat)}
                        >
                          Salvează
                        </button>

                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={cancelEditEmployee}
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <strong>
                        {emp.nume} {emp.prenume}
                      </strong>
                      <div className="muted-text">ID: {emp.id_angajat}</div>
                      <div className="muted-text">
                        Specializare: {emp.specializare || "-"}
                      </div>
                      <div className="muted-text">Telefon: {emp.telefon || "-"}</div>
                      <div className="muted-text">Email: {emp.email || "-"}</div>
                      <div className="muted-text">Salariu: {emp.salariu} lei</div>
                      <div className="muted-text">
                        Data angajării: {formatDateOnly(emp.data_start_program)}
                      </div>
                      <div className="muted-text">
                        Data nașterii: {formatDateOnly(emp.data_nastere)}
                      </div>
                      <div className="muted-text">
                        Status: {emp.activ ? "Activ" : "Inactiv"}
                      </div>

                      <div className="inline-actions" style={{ marginTop: 12 }}>
                        <button
                          className="secondary-btn"
                          onClick={() => startEditEmployee(emp)}
                        >
                          Editează
                        </button>

                         {emp.activ ? (
                          <button
                           className="danger-btn"
                            onClick={() => handleSetEmployeeInactive(emp.id_angajat)}
                          >
                           Setează inactiv
                          </button>
                          ) : (
                          <button
                         className="primary-btn"
                          onClick={() => handleActivateEmployee(emp.id_angajat)}
                         >
                          Reactivează
                         </button>
                        )}
                        <button
                          className="secondary-btn"
                          onClick={() => handleOpenServiciiAngajat(emp)}
                        >
                          Servicii
                       </button>
                      </div>
                      {angajatServiciiId === emp.id_angajat && (
  <div className="panel" style={{ marginTop: 12 }}>
    <h4 style={{ marginBottom: 12 }}>
      Servicii pentru {emp.nume} {emp.prenume}
    </h4>

    {loadingAngajatServicii ? (
      <p className="muted-text">Se încarcă serviciile...</p>
    ) : (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {services
            .filter((s) => s.activ !== false)
            .map((s) => (
              <label
                key={s.id_serviciu}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={angajatServiciiSelected.includes(Number(s.id_serviciu))}
                  onChange={() => handleToggleServiciu(s.id_serviciu)}
                  style={{ width: "auto", minHeight: "auto" }}
                />
                <span>
                  {s.denumire_serviciu} • {s.durata_minute} min • {s.pret} lei
                </span>
              </label>
            ))}
        </div>

        <div className="inline-actions">
          <button
            className="primary-btn"
            type="button"
            onClick={handleSaveServiciiAngajat}
          >
            Salvează
          </button>

          <button
            className="secondary-btn"
            type="button"
            onClick={handleCloseServiciiAngajat}
          >
            Anulează
          </button>
        </div>
      </>
    )}
  </div>
)}
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

export default AngajatiTab;