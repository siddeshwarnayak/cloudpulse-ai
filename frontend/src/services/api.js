// Accept either VITE_API_BASE_URL or the alternative VITE_API_URL for compatibility.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:4000/api";

class ApiClientError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (networkErr) {
    throw new ApiClientError("Cannot reach the CloudPulse backend. Is it running on port 4000?", 0);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // non-JSON response
  }

  if (!response.ok) {
    throw new ApiClientError(body?.error?.message || `Request failed (${response.status})`, response.status);
  }

  return body?.data;
}

export const api = {
  health: () => request("/health"),

  resources: {
    list: () => request("/resources"),
    get: (id) => request(`/resources/${id}`),
  },

  metrics: {
    recent: (limit = 50) => request(`/metrics?limit=${limit}`),
    forResource: (resourceId, limit = 100) => request(`/metrics/${resourceId}?limit=${limit}`),
  },

  anomalies: {
    list: (status) => request(`/anomalies${status ? `?status=${status}` : ""}`),
    resolve: (id) => request(`/anomalies/${id}/resolve`, { method: "POST" }),
  },

  cost: {
    summary: () => request("/cost"),
    recommendations: () => request("/cost/recommendations"),
  },

  auth: {
    register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  },
};

export { ApiClientError };
