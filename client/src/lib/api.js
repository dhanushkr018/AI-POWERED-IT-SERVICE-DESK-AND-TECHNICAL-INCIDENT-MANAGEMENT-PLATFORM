const apiBase = import.meta.env.VITE_API_URL || "";

export async function api(path, { token, method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("The API is not running. From the project folder, run npm run dev.");
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  return payload;
}

export function formatApiError(error) {
  if (error?.details?.length) {
    return error.details.map((item) => item.message).join(" ");
  }
  return error?.message || "Request failed.";
}
