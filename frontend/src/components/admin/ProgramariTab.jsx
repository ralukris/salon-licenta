function ProgramariTab({
  clearMessages,
  showManualBookingForm,
  setShowManualBookingForm,
  resetManualBooking,

  bookingSearch,
  setBookingSearch,
  bookingStatusFilter,
  setBookingStatusFilter,

  handleManualBookingSubmit,
  clientSearch,
  setClientSearch,
  selectedClient,
  setSelectedClient,
  showNewClientForm,
  setShowNewClientForm,
  newClient,
  setNewClient,
  todayForInput,
  handleCreateNewClient,
  creatingClient,
  searchingClients,
  clientResults,

  manualBooking,
  setManualBooking,
  maxBookingDate,
  manualBookingSegments,
  handleRemoveManualSegment,
  manualBookingTotalDuration,
  manualBookingTotalPrice,
  loadingServices,
  services,
  loadingManualBookingEmployees,
  manualBookingEmployees,
  handleAddManualSegment,
  loadingManualSlots,
  availableManualSlots,
  selectedManualService,
  computedManualSchedule,
  formatTimeHHMM,
  submittingManualBooking,

  loadingBookings,
  filteredBookings,
  formatDateTime,
  handleFinalizeBooking,
  handleCancelBooking,
  handleIssueReceipt,
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
          Programări salon
        </h3>

        <button
          className="primary-btn"
          onClick={() => {
            clearMessages();
            setShowManualBookingForm((prev) => {
              const next = !prev;
              if (!next) resetManualBooking();
              return next;
            });
          }}
        >
          {showManualBookingForm
            ? "Închide formularul"
            : "Adaugă programare manuală"}
        </button>
      </div>

      {!showManualBookingForm && (
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Caută după nume, telefon, #ID, serviciu sau angajat"
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
          />

          <select
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
          >
            <option value="toate">Toate statusurile</option>
            <option value="Confirmata">Confirmata</option>
            <option value="Finalizata">Finalizata</option>
            <option value="Anulata">Anulata</option>
          </select>
        </div>
      )}

      {showManualBookingForm && (
        <form
          onSubmit={handleManualBookingSubmit}
          className="form-grid"
          style={{ marginBottom: 20 }}
        >
          {!showNewClientForm && (
            <input
              type="text"
              placeholder="Caută client după nume, prenume sau telefon"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setSelectedClient(null);
              }}
            />
          )}

          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                clearMessages();
                setShowNewClientForm((prev) => !prev);
              }}
            >
              {showNewClientForm
                ? "Închide formular client nou"
                : "Adaugă client nou fără cont"}
            </button>
          </div>

          {showNewClientForm && (
            <div style={{ gridColumn: "1 / -1" }} className="panel">
              <h4 style={{ marginBottom: 12 }}>Client nou</h4>

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
                    setNewClient((prev) => ({
                      ...prev,
                      prenume: e.target.value,
                    }))
                  }
                />

                <input
                  type="text"
                  placeholder="Telefon"
                  value={newClient.telefon}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      telefon: e.target.value,
                    }))
                  }
                />

                <div>
                  <label className="muted-text">Data nașterii</label>
                  <input
                    type="date"
                    value={newClient.data_nasterii}
                    max={todayForInput}
                    onChange={(e) =>
                      setNewClient((prev) => ({
                        ...prev,
                        data_nasterii: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="inline-actions" style={{ gridColumn: "1 / -1" }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleCreateNewClient}
                    disabled={creatingClient}
                  >
                    {creatingClient ? "Se salvează..." : "Salvează clientul"}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShowNewClientForm(false);
                      setNewClient({
                        nume: "",
                        prenume: "",
                        telefon: "",
                        data_nasterii: "",
                      });
                    }}
                  >
                    Anulează
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showNewClientForm && (
            <div style={{ gridColumn: "1 / -1" }}>
              {searchingClients ? (
                <div className="muted-text">Se caută clienți...</div>
              ) : clientSearch.trim().length < 2 ? (
                <div className="muted-text">
                  Scrie cel puțin 2 caractere pentru căutare.
                </div>
              ) : clientResults.length === 0 ? (
                <div className="muted-text">Nu s-au găsit clienți.</div>
              ) : (
                <div className="profiles-list">
                  {clientResults.map((client) => {
                    const isSelected =
                      String(selectedClient?.id_client) ===
                      String(client.id_client);

                    return (
                      <button
                        key={client.id_client}
                        type="button"
                        className={isSelected ? "primary-btn" : "secondary-btn"}
                        style={{
                          textAlign: "left",
                          justifyContent: "flex-start",
                          width: "100%",
                        }}
                        onClick={() => setSelectedClient(client)}
                      >
                        {client.nume} {client.prenume}
                        {client.telefon ? ` • ${client.telefon}` : ""}
                        {client.email ? ` • ${client.email}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!showNewClientForm && selectedClient && (
            <div style={{ gridColumn: "1 / -1" }} className="muted-text">
              Client selectat:{" "}
              <strong>
                {selectedClient.nume} {selectedClient.prenume}
              </strong>
              {selectedClient.telefon ? ` • ${selectedClient.telefon}` : ""}
              {selectedClient.email ? ` • ${selectedClient.email}` : ""}
            </div>
          )}

          {!showNewClientForm && (
            <>
              <div>
                <label className="muted-text">Data programării</label>
                <input
                  type="date"
                  value={manualBooking.data}
                  min={todayForInput}
                  max={maxBookingDate}
                  onChange={(e) => {
                    setManualBooking((prev) => ({
                      ...prev,
                      data: e.target.value,
                      id_serviciu: "",
                      id_angajat: "",
                      ora: "",
                    }));
                    clearMessages();
                  }}
                  required
                />
              </div>

              {manualBooking.data && (
                <div style={{ gridColumn: "1 / -1" }} className="muted-text">
                  Data vizitei: <strong>{manualBooking.data}</strong>
                </div>
              )}

              {manualBookingSegments.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }} className="panel">
                  <h4 style={{ marginBottom: 12 }}>Servicii adăugate</h4>

                  <div className="bookings-list">
                    {manualBookingSegments.map((segment, index) => (
                      <div
                        key={`${segment.id_serviciu}-${segment.id_angajat}-${index}`}
                        className="booking-item"
                      >
                        <strong>
                          {index + 1}. {segment.denumire_serviciu}
                        </strong>
                        <div className="muted-text">
                          Specialist: {segment.nume_angajat}
                        </div>
                        <div className="muted-text">
                          Durată: {segment.durata_minute} min • {segment.pret} lei
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleRemoveManualSegment(index)}
                          >
                            Șterge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }} className="muted-text">
                    Total: <strong>{manualBookingTotalDuration} min</strong> •{" "}
                    <strong>{manualBookingTotalPrice} lei</strong>
                  </div>
                </div>
              )}

              <select
                value={manualBooking.id_serviciu}
                onChange={(e) =>
                  setManualBooking((prev) => ({
                    ...prev,
                    id_serviciu: e.target.value,
                  }))
                }
                disabled={!manualBooking.data}
              >
                <option value="">
                  {loadingServices
                    ? "Se încarcă serviciile..."
                    : "Selectează serviciu"}
                </option>
                {services
                  .filter((service) => service.activ !== false)
                  .map((service) => (
                    <option key={service.id_serviciu} value={service.id_serviciu}>
                      {service.denumire_serviciu} • {service.durata_minute} min •{" "}
                      {service.pret} lei
                    </option>
                  ))}
              </select>

              <select
                value={manualBooking.id_angajat}
                onChange={(e) =>
                  setManualBooking((prev) => ({
                    ...prev,
                    id_angajat: e.target.value,
                  }))
                }
                disabled={
                  !manualBooking.data ||
                  !manualBooking.id_serviciu ||
                  loadingManualBookingEmployees
                }
              >
                <option value="">
                  {loadingManualBookingEmployees
                    ? "Se încarcă angajații..."
                    : "Selectează angajat"}
                </option>
                {manualBookingEmployees.map((emp) => (
                  <option key={emp.id_angajat} value={emp.id_angajat}>
                    {emp.nume} {emp.prenume}
                    {emp.specializare ? ` • ${emp.specializare}` : ""}
                  </option>
                ))}
              </select>

              <div className="inline-actions" style={{ gridColumn: "1 / -1" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleAddManualSegment}
                  disabled={
                    !manualBooking.data ||
                    !manualBooking.id_serviciu ||
                    !manualBooking.id_angajat
                  }
                >
                  Adaugă serviciul în programare
                </button>
              </div>

              <select
                value={manualBooking.ora}
                onChange={(e) =>
                  setManualBooking((prev) => ({
                    ...prev,
                    ora: e.target.value,
                  }))
                }
                required
                disabled={
                  !manualBooking.data ||
                  loadingManualSlots ||
                  manualBookingSegments.length === 0
                }
              >
                <option value="">
                  {loadingManualSlots
                    ? "Se încarcă sloturile..."
                    : "Selectează ora de început"}
                </option>
                {availableManualSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Observații"
                value={manualBooking.observatii}
                onChange={(e) =>
                  setManualBooking((prev) => ({
                    ...prev,
                    observatii: e.target.value,
                  }))
                }
              />

              {selectedManualService && (
                <div style={{ gridColumn: "1 / -1" }} className="muted-text">
                  Serviciu curent selectat: {selectedManualService.denumire_serviciu} •{" "}
                  {selectedManualService.durata_minute} min •{" "}
                  {selectedManualService.pret} lei
                </div>
              )}

              {!loadingManualSlots &&
                manualBooking.data &&
                manualBookingSegments.length > 0 &&
                availableManualSlots.length === 0 && (
                  <div style={{ gridColumn: "1 / -1" }} className="muted-text">
                    Nu există sloturi disponibile pentru toate serviciile selectate
                    la data aleasă.
                  </div>
                )}

              {computedManualSchedule.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }} className="panel">
                  <h4 style={{ marginBottom: 12 }}>Program estimat</h4>

                  <div className="bookings-list">
                    {computedManualSchedule.map((segment, index) => (
                      <div
                        key={`${segment.id_serviciu}-${segment.id_angajat}-${index}-schedule`}
                        className="booking-item"
                      >
                        <strong>
                          {index + 1}. {segment.denumire_serviciu}
                        </strong>
                        <div className="muted-text">
                          Specialist: {segment.nume_angajat}
                        </div>
                        <div className="muted-text">
                          {formatTimeHHMM(segment.start)} →{" "}
                          {formatTimeHHMM(segment.end)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="inline-actions" style={{ gridColumn: "1 / -1" }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    submittingManualBooking ||
                    !selectedClient ||
                    manualBookingSegments.length === 0 ||
                    !manualBooking.data ||
                    !manualBooking.ora
                  }
                >
                  {submittingManualBooking
                    ? "Se salvează..."
                    : "Salvează programarea"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    resetManualBooking();
                    setShowManualBookingForm(false);
                  }}
                >
                  Anulează
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {!showManualBookingForm &&
        (loadingBookings ? (
          <p className="muted-text">Se încarcă programările...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="muted-text">
            Nu există programări care să corespundă filtrării.
          </p>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map((booking) => (
              <div key={booking.id_programare} className="booking-item">
                <strong>#{booking.id_programare}</strong>

                <div className="muted-text">
                  Client: {booking.nume_client} {booking.prenume_client}
                  {booking.telefon_client ? ` • ${booking.telefon_client}` : ""}
                </div>

                <div className="muted-text">
                  Status: <strong>{booking.status}</strong> • Total:{" "}
                  <strong>{booking.total} lei</strong>
                </div>

                {booking.observatii && (
                  <div className="muted-text">
                    Observații: {booking.observatii}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <strong>Servicii:</strong>
                  <div style={{ marginTop: 8 }} className="profiles-list">
                    {booking.servicii.map((item) => (
                      <div
                        key={item.id_programare_serviciu}
                        className="profile-item"
                        style={{ marginBottom: 8 }}
                      >
                        <strong>{item.denumire_serviciu}</strong>
                        <div className="muted-text">
                          Specialist: {item.nume_angajat} {item.prenume_angajat}
                        </div>
                        <div className="muted-text">
                          {formatDateTime(item.data_start)} →{" "}
                          {formatDateTime(item.data_final)}
                        </div>
                        <div className="muted-text">{item.pret} lei</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12 }} className="inline-actions">
                  <button
                    className="primary-btn"
                    onClick={() => handleFinalizeBooking(booking.id_programare)}
                    disabled={
                      booking.status === "Finalizata" ||
                      booking.status === "Anulata"
                    }
                  >
                    Finalizează
                  </button>

                  <button
                    className="danger-btn"
                    onClick={() => handleCancelBooking(booking.id_programare)}
                    disabled={booking.status === "Anulata" || booking.hasReceipt}
                  >
                    Anulează programarea
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() => handleIssueReceipt(booking.id_programare)}
                    disabled={
                      booking.status !== "Finalizata" || booking.hasReceipt
                    }
                  >
                    {booking.hasReceipt
                      ? "Chitanță deja emisă"
                      : "Emite chitanță"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

export default ProgramariTab;