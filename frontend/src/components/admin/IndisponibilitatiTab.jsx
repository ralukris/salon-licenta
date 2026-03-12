function IndisponibilitatiTab({
  handleAddUnavailability,
  newUnavailability,
  setNewUnavailability,
  employees,
  todayForInput,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedEmployeeName,
  loadingUnavailability,
  unavailabilityList,
  formatDateOnly,
  handleDeleteUnavailability,
}) {
  return (
    <>
      <div className="panel">
        <h3 className="section-title">Adaugă indisponibilitate</h3>

        <form onSubmit={handleAddUnavailability} className="form-grid">
          <select
            value={newUnavailability.id_angajat}
            onChange={(e) =>
              setNewUnavailability((prev) => ({
                ...prev,
                id_angajat: e.target.value,
              }))
            }
            required
          >
            <option value="">Selectează angajat</option>
            {employees.map((emp) => (
              <option key={emp.id_angajat} value={emp.id_angajat}>
                {emp.nume} {emp.prenume}
              </option>
            ))}
          </select>

          <div>
            <label className="muted-text">Data început</label>
            <input
              type="date"
              value={newUnavailability.data_start}
              min={todayForInput}
              onChange={(e) =>
                setNewUnavailability((prev) => ({
                  ...prev,
                  data_start: e.target.value,
                  data_final:
                    prev.data_final && prev.data_final < e.target.value
                      ? e.target.value
                      : prev.data_final,
                }))
              }
              required
            />
          </div>

          <div>
            <label className="muted-text">Data sfârșit</label>
            <input
              type="date"
              value={newUnavailability.data_final}
              min={newUnavailability.data_start || todayForInput}
              onChange={(e) =>
                setNewUnavailability((prev) => ({
                  ...prev,
                  data_final: e.target.value,
                }))
              }
              required
            />
          </div>

          <select
            value={newUnavailability.tip}
            onChange={(e) =>
              setNewUnavailability((prev) => ({
                ...prev,
                tip: e.target.value,
              }))
            }
          >
            <option value="concediu">concediu</option>
            <option value="medical">medical</option>
            <option value="urgenta">urgenta</option>
          </select>

          <input
            type="text"
            placeholder="Motiv"
            value={newUnavailability.motiv}
            onChange={(e) =>
              setNewUnavailability((prev) => ({
                ...prev,
                motiv: e.target.value,
              }))
            }
          />

          <button type="submit" className="primary-btn">
            Adaugă indisponibilitate
          </button>
        </form>
      </div>

      <div className="panel">
        <h3 className="section-title">Vezi indisponibilități pe angajat</h3>

        <div className="form-grid">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">Selectează angajat</option>
            {employees.map((emp) => (
              <option key={emp.id_angajat} value={emp.id_angajat}>
                {emp.nume} {emp.prenume}
              </option>
            ))}
          </select>
        </div>

        {selectedEmployeeName && (
          <div style={{ marginTop: 14 }} className="muted-text">
            Angajat selectat: {selectedEmployeeName.nume}{" "}
            {selectedEmployeeName.prenume}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {loadingUnavailability ? (
            <p className="muted-text">Se încarcă indisponibilitățile...</p>
          ) : !selectedEmployeeId ? (
            <p className="muted-text">
              Selectează un angajat pentru a vedea lista.
            </p>
          ) : unavailabilityList.length === 0 ? (
            <p className="muted-text">
              Nu există indisponibilități pentru acest angajat.
            </p>
          ) : (
            <div className="bookings-list">
              {unavailabilityList.map((item) => (
                <div key={item.id_indisponibilitate} className="booking-item">
                  <strong>
                    #{item.id_indisponibilitate} • {item.tip}
                  </strong>
                  <div className="muted-text">
                    {formatDateOnly(item.data_start)} →{" "}
                    {formatDateOnly(item.data_final)}
                  </div>
                  <div className="muted-text">{item.motiv || "-"}</div>
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="danger-btn"
                      onClick={() =>
                        handleDeleteUnavailability(item.id_indisponibilitate)
                      }
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default IndisponibilitatiTab;