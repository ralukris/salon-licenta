const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Eroare server");
  }
  return data;
}

export async function getLocatii(token) {
  const res = await fetch(`${API_URL}/manager/locatii`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createLocatie(token, data) {
  const res = await fetch(`${API_URL}/manager/locatii`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateLocatie(token, id, data) {
  const res = await fetch(`${API_URL}/manager/locatii/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getAdministratori(token) {
  const res = await fetch(`${API_URL}/manager/administratori`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createAdministrator(token, data) {
  const res = await fetch(`${API_URL}/manager/administratori`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateAdministrator(token, id, data) {
  const res = await fetch(`${API_URL}/manager/administratori/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function dezactiveazaAdministrator(token, id) {
  const res = await fetch(
    `${API_URL}/manager/administratori/${id}/dezactiveaza`,
    {
      method: "PATCH",
      headers: authHeaders(token),
    }
  );
  return handleResponse(res);
}