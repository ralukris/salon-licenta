import { useMemo, useState } from "react";
import BookingWizard from "./BookingWizard";

function ClientDashboard({ token, user, profiles, programari, onLogout, onFetchClientData, onCancelBooking, onCreateProfile, onUpdateProfile, onDeleteProfile, cancellingBookingId }) {

  const today = new Date().toISOString().split("T")[0];

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [newNume, setNewNume] = useState("");
  const [newPrenume, setNewPrenume] = useState("");
  const [newData, setNewData] = useState("");

  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editNume, setEditNume] = useState("");
  const [editPrenume, setEditPrenume] = useState("");
  const [editData, setEditData] = useState("");

  const [message, setMessage] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(false);

  const startEditProfile = (profile) => {
    setEditingProfileId(profile.id_client);
    setEditNume(profile.nume || "");
    setEditPrenume(profile.prenume || "");
    setEditData(
      profile.data_nasterii
        ? new Date(profile.data_nasterii).toISOString().split("T")[0]
        : ""
    );
    setShowProfileForm(false);
  };

  const cancelEditProfile = () => {
    setEditingProfileId(null);
    setEditNume("");
    setEditPrenume("");
    setEditData("");
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!newNume || !newPrenume || !newData) {
      setMessage("Completează toate câmpurile pentru profil.");
      return;
    }
    try {
      await onCreateProfile({ nume: newNume, prenume: newPrenume, data_nasterii: newData });
      setShowProfileForm(false);
      setNewNume("");
      setNewPrenume("");
      setNewData("");
    } catch (err) {
      setMessage(err.message || "Eroare la creare profil.");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!editingProfileId || !editNume || !editPrenume || !editData) {
      setMessage("Completează toate câmpurile.");
      return;
    }
    try {
      await onUpdateProfile(editingProfileId, { nume: editNume, prenume: editPrenume, data_nasterii: editData });
      cancelEditProfile();
    } catch (err) {
      setMessage(err.message || "Eroare la actualizare profil.");
    }
  };

  const handleDeleteProfile = async () => {
    if (!editingProfileId) return;
    const confirmed = window.confirm(
      "Sigur vrei să ștergi acest profil? Contactați recepția pentru a actualiza numărul de telefon al acestei persoane și pentru a-i crea un cont propriu."
    );
    if (!confirmed) return;

    setMessage("");
    setDeletingProfile(true);
    try {
      await onDeleteProfile(editingProfileId);
      cancelEditProfile();
    } catch (err) {
      setMessage(err.message || "Eroare la ștergere profil.");
    } finally {
      setDeletingProfile(false);
    }
  };

  const groupedBookings = useMemo(() => {
    const groupedMap = new Map();
    for (const row of programari) {
      const bookingId = row.id_programare;
      if (!groupedMap.has(bookingId)) {
        groupedMap.set(bookingId, {
          id_programare: row.id_programare,
          status: row.status,
          observatii: row.observatii,
          data_creare: row.data_creare,
          denumire_locatie: row.denumire_locatie,
          id_client: row.id_client,
          nume_client: row.nume_client,
          prenume_client: row.prenume_client,
          segmente: [],
        });
      }
      groupedMap.get(bookingId).segmente.push({
        id_programare_serviciu: row.id_programare_serviciu,
        data_start: row.data_start,
        data_final: row.data_final,
        id_serviciu: row.id_serviciu,
        denumire_serviciu: row.denumire_serviciu,
        durata_minute: row.durata_minute,
        pret: row.pret,
        id_angajat: row.id_angajat,
        nume_angajat: row.nume_angajat,
        prenume_angajat: row.prenume_angajat,
      });
    }

    const groupedArray = Array.from(groupedMap.values()).map((booking) => {
      const sortedSegments = [...booking.segmente].sort(
        (a, b) => new Date(a.data_start) - new Date(b.data_start)
      );
      return {
        ...booking,
        segmente: sortedSegments,
        firstStart: sortedSegments[0]?.data_start || null,
        lastEnd: sortedSegments[sortedSegments.length - 1]?.data_final || null,
      };
    });

    return groupedArray.sort(
      (a, b) => new Date(b.firstStart || 0) - new Date(a.firstStart || 0)
    );
  }, [programari]);

  const getStatusBadgeClass = (status) => {
    if (status === "Confirmata") return "status-badge status-confirmata";
    if (status === "Finalizata") return "status-badge status-finalizata";
    if (status === "Anulata") return "status-badge status-anulata";
    return "status-badge";
  };

  return (
    <div>
      <div className="topbar" style={{ marginBottom: "16px", marginTop: "0px" }}>
        <div>
          <h2>Pagina mea</h2>
          {user?.email && <div className="muted-text">{user.email}</div>}
        </div>
        <button className="danger-btn" onClick={onLogout}>Logout</button>
      </div>

      {message && <div className="message info">{message}</div>}

      <div className="panel">
        <h3 className="section-title">Profiluri</h3>

        {profiles.length === 0 ? (
          <p className="muted-text">Nu ai niciun profil adăugat.</p>
        ) : (
          <div className="profiles-list">
            {profiles.map((p) => (
              <div key={p.id_client} className="profile-item">
                <strong>{p.nume} {p.prenume}</strong>
                <div className="muted-text">
                  Data nașterii:{" "}
                  {p.data_nasterii
                    ? new Date(p.data_nasterii).toLocaleDateString("ro-RO")
                    : "-"}
                </div>
                <div className="muted-text">Telefon: {p.telefon || "-"}</div>
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => startEditProfile(p)}
                  >
                    Editează profilul
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingProfileId && (
          <form onSubmit={handleUpdateProfile} className="form-grid" style={{ marginTop: 16 }}>
            <input type="text" placeholder="Nume" value={editNume}
              onChange={(e) => setEditNume(e.target.value)} required />
            <input type="text" placeholder="Prenume" value={editPrenume}
              onChange={(e) => setEditPrenume(e.target.value)} required />
            <div>
              <label className="field-label">Data nașterii</label>
              <input type="date" value={editData} max={today}
                onChange={(e) => setEditData(e.target.value)} required />
            </div>
            <div className="inline-actions">
              <button type="submit" className="primary-btn">Salvează modificările</button>
              <button type="button" className="secondary-btn" onClick={cancelEditProfile}>
                Renunță
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleDeleteProfile}
                disabled={deletingProfile}
              >
                {deletingProfile ? "Se șterge..." : "Șterge profilul"}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 16 }}>
          <button
            className="secondary-btn"
            onClick={() => {
              cancelEditProfile();
              setShowProfileForm((v) => !v);
            }}
          >
            {showProfileForm ? "Anulează" : "Adaugă profil"}
          </button>
        </div>

        {showProfileForm && (
          <form onSubmit={handleCreateProfile} className="form-grid" style={{ marginTop: 16 }}>
            <input type="text" placeholder="Nume" value={newNume}
              onChange={(e) => setNewNume(e.target.value)} required />
            <input type="text" placeholder="Prenume" value={newPrenume}
              onChange={(e) => setNewPrenume(e.target.value)} required />
            <div>
              <label className="field-label">Data nașterii</label>
              <input type="date" value={newData} max={today}
                onChange={(e) => setNewData(e.target.value)} required />
            </div>
            <button type="submit" className="primary-btn">Salvează profil</button>
          </form>
        )}
      </div>

      <div className="panel">
        <h3 className="section-title">Programări</h3>

        {groupedBookings.length === 0 ? (
          <p className="muted-text">Nu ai programări încă.</p>
        ) : (
          <div className="bookings-list">
            {groupedBookings.map((booking) => {
              const isCancelled = booking.status === "Anulata";
              const isFinished = booking.status === "Finalizata";
              const canCancel = !isCancelled && !isFinished;

              return (
                <div key={booking.id_programare} className="booking-item">
                  <div className="booking-header">
                    <div>
                      <strong>{booking.denumire_locatie}</strong>
                      <span className={getStatusBadgeClass(booking.status)}>
                        {booking.status}
                      </span>
                      <div className="muted-text">
                        {booking.nume_client} {booking.prenume_client}
                      </div>
                      {booking.firstStart && booking.lastEnd && (
                        <div className="muted-text">
                          {new Date(booking.firstStart).toLocaleString("ro-RO")} →{" "}
                          {new Date(booking.lastEnd).toLocaleString("ro-RO")}
                        </div>
                      )}
                    </div>
                    <div className="booking-actions">
                      <button
                        className="danger-btn"
                        onClick={() => onCancelBooking(booking.id_programare)}
                        disabled={!canCancel || cancellingBookingId === booking.id_programare}
                        style={{
                          opacity: canCancel && cancellingBookingId !== booking.id_programare ? 1 : 0.6,
                        }}
                      >
                        {cancellingBookingId === booking.id_programare
                          ? "Se anulează..."
                          : "Anulează programarea"}
                      </button>
                    </div>
                  </div>

                  <div className="booking-segments">
                    {booking.segmente.map((segment, index) => (
                      <div key={segment.id_programare_serviciu} className="booking-segment-card">
                        <div style={{ fontWeight: 600 }}>
                          {index + 1}. {segment.denumire_serviciu}
                        </div>
                        <div className="muted-text">
                          cu {segment.nume_angajat} {segment.prenume_angajat} •{" "}
                          {segment.durata_minute} min • {segment.pret} lei
                        </div>
                        <div className="muted-text">
                          {new Date(segment.data_start).toLocaleString("ro-RO")} →{" "}
                          {new Date(segment.data_final).toLocaleString("ro-RO")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="wizard-wrapper">
        <BookingWizard
          token={token}
          profiles={profiles}
          onBookingCreated={onFetchClientData}
        />
      </div>
    </div>
  );
}

export default ClientDashboard;