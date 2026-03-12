const API_BASE = "http://localhost:3000";

const parseJsonSafe = async (res) => {
  return res.json().catch(() => ({}));
};

const getErrorMessage = (data, fallbackMessage) => {
  return data?.error || fallbackMessage;
};

export async function getEmployees(token) {
  const res = await fetch(`${API_BASE}/admin/angajati`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la încărcarea angajaților."));
  }

  return Array.isArray(data) ? data : [];
}

export async function getBookings(token) {
  const res = await fetch(`${API_BASE}/admin/programari`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la încărcarea programărilor."));
  }

  return Array.isArray(data) ? data : [];
}

export async function getStocks(token) {
  const res = await fetch(`${API_BASE}/admin/stocuri`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la încărcarea stocurilor."));
  }

  return Array.isArray(data) ? data : [];
}

export async function getServices(token) {
  const res = await fetch(`${API_BASE}/admin/servicii`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la încărcarea serviciilor."));
  }

  return Array.isArray(data) ? data : [];
}

export async function getUnavailability(token, employeeId) {
  const res = await fetch(
    `${API_BASE}/admin/angajati/${employeeId}/indisponibilitati`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Eroare la încărcarea indisponibilităților.")
    );
  }

  return Array.isArray(data) ? data : [];
}

export async function getAvailableReceipts(token) {
  const res = await fetch(`${API_BASE}/admin/chitante/disponibile-plata`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la încărcarea chitanțelor."));
  }

  return Array.isArray(data) ? data : [];
}

export async function getReceiptsHistory(token) {
  const res = await fetch(`${API_BASE}/admin/chitante/istoric`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Eroare la încărcarea istoricului plăților.")
    );
  }

  return Array.isArray(data) ? data : [];
}

export async function searchClients(token, query, signal) {
  const res = await fetch(
    `${API_BASE}/admin/clienti/search?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la căutarea clienților."));
  }

  return Array.isArray(data) ? data : [];
}

export async function getEmployeesForService(locationId, serviceId) {
  const res = await fetch(
    `${API_BASE}/public/locatii/${locationId}/servicii/${serviceId}/angajati`
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error("Eroare la încărcarea angajaților pentru serviciu.");
  }

  return Array.isArray(data) ? data : [];
}

export async function getMultipleAvailableSlots(token, payload) {
  const res = await fetch(
    `${API_BASE}/admin/programari/sloturi-disponibile-multiple`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error("Eroare la încărcarea sloturilor disponibile.");
  }

  return Array.isArray(data) ? data : [];
}

export async function createUnavailability(token, payload) {
  const res = await fetch(`${API_BASE}/admin/indisponibilitati`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la adăugarea indisponibilității."));
  }

  return data;
}

export async function deleteUnavailability(token, id) {
  const res = await fetch(`${API_BASE}/admin/indisponibilitati/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la ștergere."));
  }

  return data;
}

export async function finalizeBooking(token, idProgramare) {
  const res = await fetch(
    `${API_BASE}/admin/programari/${idProgramare}/finalizeaza`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Eroare la finalizarea programării.")
    );
  }

  return data;
}

export async function cancelBooking(token, idProgramare) {
  const res = await fetch(
    `${API_BASE}/admin/programari/${idProgramare}/anulare`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la anularea programării."));
  }

  return data;
}

export async function issueReceipt(token, idProgramare) {
  const res = await fetch(`${API_BASE}/admin/chitante`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id_programare: Number(idProgramare),
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la emiterea chitanței."));
  }

  return data;
}

export async function registerPayment(token, payload) {
  const res = await fetch(`${API_BASE}/admin/plati`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la înregistrarea plății."));
  }

  return data;
}

export async function addProduct(token, payload) {
  const res = await fetch(`${API_BASE}/admin/produse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la adăugarea produsului."));
  }

  return data;
}

export async function updateStock(token, idStoc, payload) {
  const res = await fetch(`${API_BASE}/admin/stocuri/${idStoc}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la actualizarea stocului."));
  }

  return data;
}

export async function deactivateProduct(token, idProdus) {
  const res = await fetch(`${API_BASE}/admin/produse/${idProdus}/dezactiveaza`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la dezactivarea produsului."));
  }

  return data;
}

export async function addEmployee(token, payload) {
  const res = await fetch(`${API_BASE}/admin/angajati`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la adăugarea angajatului."));
  }

  return data;
}

export async function updateEmployee(token, idAngajat, payload) {
  const res = await fetch(`${API_BASE}/admin/angajati/${idAngajat}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la actualizarea angajatului."));
  }

  return data;
}

export async function setEmployeeInactive(token, idAngajat) {
  const res = await fetch(`${API_BASE}/admin/angajati/${idAngajat}/inactiv`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Eroare la actualizarea statusului angajatului.")
    );
  }

  return data;
}

export async function addService(token, payload) {
  const res = await fetch(`${API_BASE}/admin/servicii`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la adăugarea serviciului."));
  }

  return data;
}

export async function updateService(token, idServiciu, payload) {
  const res = await fetch(`${API_BASE}/admin/servicii/${idServiciu}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la actualizarea serviciului."));
  }

  return data;
}

export async function deactivateService(token, idServiciu) {
  const res = await fetch(
    `${API_BASE}/admin/servicii/${idServiciu}/dezactiveaza`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Eroare la dezactivarea serviciului."));
  }

  return data;
}

export async function createClient(token, payload) {
  const res = await fetch(`${API_BASE}/admin/clienti`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const err = new Error(getErrorMessage(data, "Eroare la adăugarea clientului."));
    err.data = data;
    throw err;
  }

  return data;
}

export async function createManualBooking(token, payload) {
  const res = await fetch(`${API_BASE}/admin/programari/manual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Eroare la adăugarea programării manuale.")
    );
  }

  return data;
}