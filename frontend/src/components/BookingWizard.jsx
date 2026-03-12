import { useEffect, useMemo, useState } from "react";

function BookingWizard({ token, profiles, onBookingCreated }) {
  const [step, setStep] = useState(1);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileName, setSelectedProfileName] = useState("");

  const [locatii, setLocatii] = useState([]);
  const [selectedLocatie, setSelectedLocatie] = useState(null);
  const [selectedLocatieName, setSelectedLocatieName] = useState("");

  const [servicii, setServicii] = useState([]);
  const [selectedServiciu, setSelectedServiciu] = useState(null);
  const [selectedServiciuName, setSelectedServiciuName] = useState("");
  const [selectedServiciuDurata, setSelectedServiciuDurata] = useState(null);
  const [selectedServiciuPret, setSelectedServiciuPret] = useState(null);

  const [availableEmployeesForService, setAvailableEmployeesForService] = useState([]);
  const [selectedAngajat, setSelectedAngajat] = useState(null);
  const [selectedAngajatName, setSelectedAngajatName] = useState("");

  const [selectedSegments, setSelectedSegments] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const minDate = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const maxDate = useMemo(() => {
    const now = new Date();
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const yyyy = endOfNextMonth.getFullYear();
    const mm = String(endOfNextMonth.getMonth() + 1).padStart(2, "0");
    const dd = String(endOfNextMonth.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const totalPrice = useMemo(() => {
    return selectedSegments.reduce((sum, segment) => sum + Number(segment.pret || 0), 0);
  }, [selectedSegments]);

  const totalDuration = useMemo(() => {
    return selectedSegments.reduce(
      (sum, segment) => sum + Number(segment.durata_minute || 0),
      0
    );
  }, [selectedSegments]);

  useEffect(() => {
    const fetchData = async () => {
      setErrorMessage("");

      try {
        if (step === 2) {
          const res = await fetch("http://localhost:3000/public/locatii");
          const data = await res.json().catch(() => []);
          setLocatii(Array.isArray(data) ? data : []);
        }

        if (step >= 4) {
          const res = await fetch("http://localhost:3000/public/servicii");
          const data = await res.json().catch(() => []);
          setServicii(Array.isArray(data) ? data : []);
        }
      } catch {
        if (step === 2) setLocatii([]);
        if (step >= 4) setServicii([]);
        setErrorMessage("Eroare la încărcarea datelor.");
      }
    };

    fetchData();
  }, [step]);

  useEffect(() => {
    const fetchAvailableEmployees = async () => {
      if (
        step !== 4 ||
        !selectedLocatie ||
        !selectedDate ||
        !selectedServiciu
      ) {
        setAvailableEmployeesForService([]);
        return;
      }

      setLoadingEmployees(true);
      setErrorMessage("");
      setInfoMessage("");

      try {
        const url =
          `http://localhost:3000/public/sloturi-disponibile-generale` +
          `?id_locatie=${selectedLocatie}&id_serviciu=${selectedServiciu}&data=${selectedDate}`;

        const res = await fetch(url);
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setAvailableEmployeesForService([]);
          setErrorMessage(data?.error || "Eroare la încărcarea specialiștilor disponibili.");
          return;
        }

        const slots = Array.isArray(data) ? data : [];
        const uniqueEmployeesMap = new Map();

        for (const slot of slots) {
          const employees = Array.isArray(slot.angajati) ? slot.angajati : [];
          for (const emp of employees) {
            if (!uniqueEmployeesMap.has(emp.id_angajat)) {
              uniqueEmployeesMap.set(emp.id_angajat, emp);
            }
          }
        }

        setAvailableEmployeesForService(Array.from(uniqueEmployeesMap.values()));
      } catch {
        setAvailableEmployeesForService([]);
        setErrorMessage("Eroare de conexiune la încărcarea specialiștilor.");
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchAvailableEmployees();
  }, [step, selectedLocatie, selectedDate, selectedServiciu]);

  useEffect(() => {
    const fetchPackageSlots = async () => {
      if (
        step !== 5 ||
        !selectedDate ||
        !selectedLocatie ||
        !Array.isArray(selectedSegments) ||
        selectedSegments.length === 0
      ) {
        setAvailableSlots([]);
        return;
      }

      setLoadingSlots(true);
      setErrorMessage("");
      setInfoMessage("");

      try {
        const res = await fetch(
          "http://localhost:3000/public/sloturi-disponibile-multiple",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id_locatie: Number(selectedLocatie),
              data: selectedDate,
              segmente: selectedSegments.map((segment) => ({
                id_serviciu: Number(segment.id_serviciu),
                id_angajat: Number(segment.id_angajat),
              })),
            }),
          }
        );

        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setAvailableSlots([]);
          setErrorMessage(data?.error || "Eroare la încărcarea sloturilor.");
          return;
        }

        setAvailableSlots(Array.isArray(data) ? data : []);
      } catch {
        setAvailableSlots([]);
        setErrorMessage("Eroare de conexiune la încărcarea sloturilor.");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchPackageSlots();
  }, [step, selectedDate, selectedLocatie, selectedSegments]);

  const buildDateFromLocal = (dateString, timeString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const [hour, minute] = timeString.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  };

  const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60000);
  };

  const formatSqlDateTime = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const formatHourMinute = (date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
  };

  const computedSchedule = useMemo(() => {
    if (!selectedDate || !selectedTime || selectedSegments.length === 0) {
      return [];
    }

    const result = [];
    let cursor = buildDateFromLocal(selectedDate, selectedTime);

    for (const segment of selectedSegments) {
      const start = new Date(cursor);
      const end = addMinutes(start, Number(segment.durata_minute || 0));

      result.push({
        ...segment,
        start,
        end,
      });

      cursor = end;
    }

    return result;
  }, [selectedDate, selectedTime, selectedSegments]);

  const clearCurrentServiceSelection = () => {
    setSelectedServiciu(null);
    setSelectedServiciuName("");
    setSelectedServiciuDurata(null);
    setSelectedServiciuPret(null);
    setSelectedAngajat(null);
    setSelectedAngajatName("");
    setAvailableEmployeesForService([]);
  };

  const resetWizard = () => {
    setStep(1);

    setSelectedProfile(null);
    setSelectedProfileName("");

    setSelectedLocatie(null);
    setSelectedLocatieName("");

    setSelectedServiciu(null);
    setSelectedServiciuName("");
    setSelectedServiciuDurata(null);
    setSelectedServiciuPret(null);

    setSelectedAngajat(null);
    setSelectedAngajatName("");
    setAvailableEmployeesForService([]);

    setSelectedSegments([]);

    setSelectedDate("");
    setSelectedTime("");
    setAvailableSlots([]);

    setInfoMessage("");
    setErrorMessage("");
  };

  const goBack = () => {
    setErrorMessage("");
    setInfoMessage("");

    if (step === 5) {
      setSelectedTime("");
      setAvailableSlots([]);
      setStep(4);
      return;
    }

    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSelectProfile = (profile) => {
    setErrorMessage("");
    setInfoMessage("");

    setSelectedProfile(profile.id_client);
    setSelectedProfileName(`${profile.nume} ${profile.prenume}`);

    setSelectedLocatie(null);
    setSelectedLocatieName("");
    setSelectedDate("");
    setSelectedTime("");
    setSelectedSegments([]);
    clearCurrentServiceSelection();
    setAvailableSlots([]);

    setStep(2);
  };

  const handleSelectLocation = (locatie) => {
    setErrorMessage("");
    setInfoMessage("");

    setSelectedLocatie(locatie.id_locatie);
    setSelectedLocatieName(locatie.denumire);

    setSelectedDate("");
    setSelectedTime("");
    setSelectedSegments([]);
    clearCurrentServiceSelection();
    setAvailableSlots([]);

    setStep(3);
  };

  const handleDateChange = (value) => {
    setErrorMessage("");
    setInfoMessage("");

    setSelectedDate(value);
    setSelectedTime("");
    setAvailableSlots([]);

    setSelectedSegments([]);
    clearCurrentServiceSelection();
  };

  const handleSelectService = (service) => {
    setErrorMessage("");
    setInfoMessage("");

    if (!selectedDate) {
      setErrorMessage("Selectează mai întâi data vizitei.");
      return;
    }

    setSelectedServiciu(service.id_serviciu);
    setSelectedServiciuName(service.denumire_serviciu);
    setSelectedServiciuDurata(service.durata_minute);
    setSelectedServiciuPret(service.pret);
    setSelectedAngajat(null);
    setSelectedAngajatName("");
  };

  const handleAddCurrentSegment = () => {
    setErrorMessage("");
    setInfoMessage("");

    if (
      !selectedServiciu ||
      !selectedAngajat ||
      !selectedServiciuName ||
      !selectedAngajatName
    ) {
      setErrorMessage("Selectează serviciul și specialistul.");
      return;
    }

    const alreadyExists = selectedSegments.some(
      (segment) =>
        Number(segment.id_serviciu) === Number(selectedServiciu) &&
        Number(segment.id_angajat) === Number(selectedAngajat)
    );

    if (alreadyExists) {
      setErrorMessage("Acest serviciu cu acest specialist a fost deja adăugat.");
      return;
    }

    const newSegment = {
      id_serviciu: Number(selectedServiciu),
      id_angajat: Number(selectedAngajat),
      denumire_serviciu: selectedServiciuName,
      durata_minute: Number(selectedServiciuDurata || 0),
      pret: Number(selectedServiciuPret || 0),
      nume_angajat: selectedAngajatName,
    };

    setSelectedSegments((prev) => [...prev, newSegment]);
    clearCurrentServiceSelection();
  };

  const handleRemoveSegment = (indexToRemove) => {
    setErrorMessage("");
    setInfoMessage("");
    setSelectedSegments((prev) => prev.filter((_, index) => index !== indexToRemove));
    setSelectedTime("");
    setAvailableSlots([]);
  };

  const handleContinueToFinalStep = () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!selectedDate) {
      setErrorMessage("Selectează data vizitei.");
      return;
    }

    if (selectedSegments.length === 0) {
      setErrorMessage("Adaugă cel puțin un serviciu.");
      return;
    }

    setSelectedTime("");
    setAvailableSlots([]);
    setStep(5);
  };

  const handleCreateBooking = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (!selectedProfile || !selectedLocatie) {
      setErrorMessage("Rezervarea nu este completă. Reia selecțiile necesare.");
      return;
    }

    if (!selectedDate || !selectedTime) {
      setErrorMessage("Selectează data și ora de început.");
      return;
    }

    if (selectedSegments.length === 0) {
      setErrorMessage("Adaugă cel puțin un serviciu.");
      return;
    }

    setSubmitting(true);

    try {
      let cursor = buildDateFromLocal(selectedDate, selectedTime);

      const segmente = selectedSegments.map((segment) => {
        const start = new Date(cursor);
        cursor = addMinutes(start, Number(segment.durata_minute || 0));

        return {
          id_serviciu: Number(segment.id_serviciu),
          id_angajat: Number(segment.id_angajat),
          data_start: formatSqlDateTime(start),
        };
      });

      const response = await fetch("http://localhost:3000/client/programari", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_client: Number(selectedProfile),
          id_locatie: Number(selectedLocatie),
          observatii: "Programare din frontend",
          segmente,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setErrorMessage("Sesiunea a expirat. Te rog să te autentifici din nou.");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            "Unele servicii nu mai sunt disponibile consecutiv la ora aleasă. Alege alt interval."
        );
        return;
      }

      setInfoMessage("Programare creată cu succes.");

      if (typeof onBookingCreated === "function") {
        await onBookingCreated();
      }

      setTimeout(() => {
        resetWizard();
      }, 700);
    } catch {
      setErrorMessage("Eroare de conexiune cu serverul.");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumb = ["Profil", "Locație", "Dată", "Servicii", "Ora finală"];

  return (
    <div
      style={{
        marginTop: 40,
        padding: 30,
        borderRadius: 16,
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        backgroundColor: "white",
        maxWidth: 760,
      }}
    >
      <h3 style={{ marginBottom: 20 }}>Rezervare nouă</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {breadcrumb.map((b, index) => (
          <div
            key={b}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              backgroundColor: step === index + 1 ? "#4f46e5" : "#e5e7eb",
              color: step === index + 1 ? "white" : "#374151",
            }}
          >
            {b}
          </div>
        ))}
      </div>

      {selectedSegments.length > 0 && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            background: "#f9fafb",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Servicii adăugate</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedSegments.map((segment, index) => (
              <div
                key={`${segment.id_serviciu}-${segment.id_angajat}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: "white",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {index + 1}. {segment.denumire_serviciu}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {segment.nume_angajat} • {segment.durata_minute} min • {segment.pret} lei
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSegment(index)}
                  style={removeButton}
                >
                  Șterge
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>
            Total: {totalDuration} min • {totalPrice} lei
          </div>

          {selectedDate && (
            <div style={{ marginTop: 8, fontSize: 14, color: "#374151" }}>
              Data vizitei: <strong>{selectedDate}</strong>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 10,
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {errorMessage}
        </div>
      )}

      {infoMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 10,
            backgroundColor: "#dcfce7",
            color: "#166534",
            fontSize: 14,
          }}
        >
          {infoMessage}
        </div>
      )}

      {step > 1 && (
        <button
          onClick={goBack}
          style={{
            marginBottom: 20,
            background: "none",
            border: "none",
            color: "#4f46e5",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ⟵ Înapoi
        </button>
      )}

      {step === 1 && (
        <>
          {profiles.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Nu există profiluri disponibile.</div>
          ) : (
            profiles.map((p) => (
              <button
                key={p.id_client}
                onClick={() => handleSelectProfile(p)}
                style={buttonStyle}
              >
                {p.nume} {p.prenume}
              </button>
            ))
          )}
        </>
      )}

      {step === 2 && (
        <>
          {locatii.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Nu există locații disponibile.</div>
          ) : (
            locatii.map((l) => (
              <button
                key={l.id_locatie}
                onClick={() => handleSelectLocation(l)}
                style={buttonStyle}
              >
                {l.denumire}
              </button>
            ))
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              background: "#f9fafb",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>
              Selectează ziua vizitei
            </div>

            <div style={{ fontSize: 14, marginBottom: 10 }}>
              Toate serviciile din această rezervare vor fi în aceeași zi și consecutive.
            </div>

            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{ padding: 8 }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (!selectedDate) {
                setErrorMessage("Selectează data vizitei.");
                return;
              }
              setErrorMessage("");
              setInfoMessage("");
              setStep(4);
            }}
            style={{
              ...confirmButton,
              opacity: selectedDate ? 1 : 0.5,
              cursor: selectedDate ? "pointer" : "not-allowed",
            }}
            disabled={!selectedDate}
          >
            Continuă la servicii
          </button>
        </>
      )}

      {step === 4 && (
        <>
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              background: "#f9fafb",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Data aleasă: {selectedDate}
            </div>
            <div style={{ fontSize: 14 }}>
              Alege un serviciu, apoi specialistul disponibil în ziua respectivă.
            </div>
          </div>

          <div style={{ marginBottom: 12, fontWeight: 600 }}>Alege un serviciu</div>

          {servicii.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Nu există servicii disponibile.</div>
          ) : (
            servicii.map((s) => (
              <button
                key={s.id_serviciu}
                onClick={() => handleSelectService(s)}
                style={{
                  ...buttonStyle,
                  backgroundColor:
                    selectedServiciu === s.id_serviciu ? "#ede9fe" : "#f9fafb",
                  border:
                    selectedServiciu === s.id_serviciu
                      ? "1px solid #4f46e5"
                      : "1px solid #e5e7eb",
                }}
              >
                {s.denumire_serviciu}
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {s.durata_minute} min • {s.pret} lei
                </div>
              </button>
            ))
          )}

          {selectedServiciu && (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                background: "#f9fafb",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10 }}>
                Specialiști disponibili pentru {selectedServiciuName}
              </div>

              {loadingEmployees && (
                <div style={{ opacity: 0.8 }}>Se verifică disponibilitatea...</div>
              )}

              {!loadingEmployees &&
                availableEmployeesForService.length === 0 &&
                !errorMessage && (
                  <div style={{ opacity: 0.8 }}>
                    Nu există specialiști disponibili pentru acest serviciu în ziua selectată.
                  </div>
                )}

              {!loadingEmployees &&
                availableEmployeesForService.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {availableEmployeesForService.map((emp) => {
                      const fullName = `${emp.nume} ${emp.prenume}`;
                      return (
                        <button
                          key={emp.id_angajat}
                          type="button"
                          onClick={() => {
                            setSelectedAngajat(emp.id_angajat);
                            setSelectedAngajatName(fullName);
                            setErrorMessage("");
                            setInfoMessage("");
                          }}
                          style={{
                            ...buttonStyle,
                            marginBottom: 0,
                            backgroundColor:
                              selectedAngajat === emp.id_angajat ? "#ede9fe" : "#ffffff",
                            border:
                              selectedAngajat === emp.id_angajat
                                ? "1px solid #4f46e5"
                                : "1px solid #e5e7eb",
                          }}
                        >
                          {fullName}
                        </button>
                      );
                    })}

                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleAddCurrentSegment}
                        disabled={!selectedAngajat}
                        style={{
                          ...confirmButton,
                          opacity: selectedAngajat ? 1 : 0.5,
                          cursor: selectedAngajat ? "pointer" : "not-allowed",
                        }}
                      >
                        Adaugă serviciul
                      </button>

                      {selectedSegments.length > 0 && (
                        <button
                          type="button"
                          onClick={handleContinueToFinalStep}
                          style={secondaryButton}
                        >
                          Continuă la alegerea orei finale
                        </button>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {!selectedServiciu && selectedSegments.length > 0 && (
            <button
              type="button"
              onClick={handleContinueToFinalStep}
              style={{ ...confirmButton, marginTop: 10 }}
            >
              Continuă la alegerea orei finale
            </button>
          )}
        </>
      )}

      {step === 5 && (
        <>
          <div
            style={{
              marginBottom: 15,
              padding: 12,
              background: "#f9fafb",
              borderRadius: 10,
              fontSize: 14,
            }}
          >
            <strong>Rezumat:</strong>
            <br />
            {selectedProfileName}
            <br />
            {selectedLocatieName}
            <br />
            {selectedSegments.length} serviciu(e)
            <br />
            Total durată: {totalDuration} min
            <br />
            Total preț: {totalPrice} lei
            <br />
            Data vizitei: <strong>{selectedDate || "-"}</strong>
          </div>

          <div style={{ marginBottom: 10, fontWeight: 600 }}>
            Selectează ora de început pentru pachetul complet
          </div>

          {selectedDate && (
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              Ore disponibile pentru toate serviciile selectate
            </div>
          )}

          {selectedDate && loadingSlots && (
            <div style={{ opacity: 0.8 }}>Se încarcă sloturile...</div>
          )}

          {selectedDate &&
            !loadingSlots &&
            availableSlots.length === 0 &&
            !errorMessage && (
              <div style={{ opacity: 0.8 }}>
                Nu sunt sloturi disponibile pentru ziua selectată.
              </div>
            )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {availableSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => {
                  setErrorMessage("");
                  setInfoMessage("");
                  setSelectedTime(slot);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  backgroundColor: selectedTime === slot ? "#4f46e5" : "#f9fafb",
                  color: selectedTime === slot ? "white" : "#111827",
                  fontWeight: 600,
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          {computedSchedule.length > 0 && (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                background: "#f9fafb",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10 }}>
                Program estimat
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {computedSchedule.map((segment, index) => (
                  <div
                    key={`${segment.id_serviciu}-${segment.id_angajat}-${index}`}
                    style={{
                      padding: 10,
                      background: "white",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {index + 1}. {segment.denumire_serviciu}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {segment.nume_angajat}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {formatHourMinute(segment.start)} - {formatHourMinute(segment.end)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <br />
          <button
            onClick={handleCreateBooking}
            style={{
              ...confirmButton,
              opacity: selectedDate && selectedTime && !submitting ? 1 : 0.5,
              cursor:
                selectedDate && selectedTime && !submitting
                  ? "pointer"
                  : "not-allowed",
            }}
            disabled={!selectedDate || !selectedTime || submitting}
          >
            {submitting ? "Se salvează..." : "Confirmă programarea"}
          </button>
        </>
      )}
    </div>
  );
}

const buttonStyle = {
  display: "block",
  width: "100%",
  marginBottom: 10,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  cursor: "pointer",
  textAlign: "left",
};

const confirmButton = {
  padding: "10px 18px",
  backgroundColor: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButton = {
  padding: "10px 18px",
  backgroundColor: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const removeButton = {
  padding: "8px 12px",
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

export default BookingWizard;