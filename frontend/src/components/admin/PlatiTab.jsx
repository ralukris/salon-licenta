function PlatiTab({
  clearMessages,
  showReceiptsHistory,
  setShowReceiptsHistory,
  fetchReceiptsHistory,
  setReceiptsHistorySearch,
  handleRegisterPayment,
  receiptNumber,
  setReceiptNumber,
  loadingReceipts,
  availableReceipts,
  paymentType,
  setPaymentType,
  formatDateTime,
  receiptsHistorySearch,
  loadingReceiptsHistory,
  filteredReceiptsHistory,
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
          Plăți
        </h3>

        <button
          className="secondary-btn"
          type="button"
          onClick={async () => {
            clearMessages();

            if (!showReceiptsHistory) {
              setShowReceiptsHistory(true);
              await fetchReceiptsHistory();
            } else {
              setShowReceiptsHistory(false);
              setReceiptsHistorySearch("");
            }
          }}
        >
          {showReceiptsHistory
            ? "Înapoi la înregistrare plată"
            : "Istoric plăți"}
        </button>
      </div>

      {!showReceiptsHistory ? (
        <>
          <h3 className="section-title">Înregistrează plată</h3>

          <form onSubmit={handleRegisterPayment} className="form-grid">
            <select
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              required
            >
              <option value="">
                {loadingReceipts
                  ? "Se încarcă chitanțele..."
                  : "Selectează chitanța"}
              </option>
              {availableReceipts.map((ch) => (
                <option key={ch.nr_chitanta} value={ch.nr_chitanta}>
                  #{ch.nr_chitanta} • {ch.nume_client} {ch.prenume_client} •{" "}
                  {ch.suma_totala} lei
                </option>
              ))}
            </select>

            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
            </select>

            <button
              type="submit"
              className="primary-btn"
              disabled={!receiptNumber || loadingReceipts}
            >
              Înregistrează plată
            </button>
          </form>

          {!loadingReceipts && availableReceipts.length === 0 && (
            <div style={{ marginTop: 14 }} className="muted-text">
              Nu există chitanțe emise și neplătite.
            </div>
          )}

          {!loadingReceipts &&
            availableReceipts.length > 0 &&
            receiptNumber && (
              <div style={{ marginTop: 14 }} className="muted-text">
                Chitanță selectată:{" "}
                <strong>
                  {
                    availableReceipts.find(
                      (ch) =>
                        String(ch.nr_chitanta) === String(receiptNumber)
                    )?.nr_chitanta
                  }
                </strong>
              </div>
            )}

          <div style={{ marginTop: 14 }} className="muted-text">
            Aici apar doar chitanțele emise din tabul „Programări” care nu au
            încă plată înregistrată.
          </div>

          {availableReceipts.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Chitanțe disponibile</h4>
              <div className="bookings-list">
                {availableReceipts.map((ch) => (
                  <div key={ch.nr_chitanta} className="booking-item">
                    <strong>Chitanța #{ch.nr_chitanta}</strong>
                    <div className="muted-text">
                      Client: {ch.nume_client} {ch.prenume_client}
                    </div>
                    <div className="muted-text">
                      Programare: #{ch.id_programare}
                    </div>
                    <div className="muted-text">
                      Suma: <strong>{ch.suma_totala} lei</strong>
                    </div>
                    <div className="muted-text">
                      Emisă la: {formatDateTime(ch.data_emitere)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="section-title">Istoric plăți</h3>

          <div className="form-grid" style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Caută după nume, prenume, chitanță, programare, tip plată"
              value={receiptsHistorySearch}
              onChange={(e) => setReceiptsHistorySearch(e.target.value)}
            />
          </div>

          {loadingReceiptsHistory ? (
            <div className="muted-text">Se încarcă istoricul plăților...</div>
          ) : filteredReceiptsHistory.length === 0 ? (
            <div className="muted-text">
              Nu există rezultate pentru căutarea făcută.
            </div>
          ) : (
            <div className="bookings-list">
              {filteredReceiptsHistory.map((ch) => (
                <div key={ch.nr_chitanta} className="booking-item">
                  <strong>Chitanța #{ch.nr_chitanta}</strong>

                  <div className="muted-text">
                    Client: {ch.nume_client} {ch.prenume_client}
                    {ch.telefon_client ? ` • ${ch.telefon_client}` : ""}
                  </div>

                  <div className="muted-text">
                    Programare: #{ch.id_programare}
                  </div>

                  <div className="muted-text">
                    Suma: <strong>{ch.suma_totala} lei</strong>
                  </div>

                  <div className="muted-text">
                    Emisă la: {formatDateTime(ch.data_emitere)}
                  </div>

                  <div className="muted-text">
                    Status plată:{" "}
                    <strong>
                      {ch.status_plata ? ch.status_plata : "Neachitată"}
                    </strong>
                  </div>

                  <div className="muted-text">
                    Tip plată: {ch.tip_plata ? ch.tip_plata : "-"}
                  </div>

                  {ch.data_plata && (
                    <div className="muted-text">
                      Data plății: {formatDateTime(ch.data_plata)}
                    </div>
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

export default PlatiTab;