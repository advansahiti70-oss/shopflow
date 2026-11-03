/**
 * Thin wrapper around fetch() for the ShopFlow REST API.
 * Every function returns the parsed JSON body or throws an ApiError.
 */
import { getToken, clearSession } from './session.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details = [] } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('We could not reach the server. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // An expired or invalid token: forget it so the user can sign in again.
    if (response.status === 401 && token) clearSession();
    const error = (data && data.error) || {};
    throw new ApiError(error.message || `Request failed (${response.status})`, {
      status: response.status,
      code: error.code,
      details: error.details || [],
    });
  }
  return data;
}

export const api = {
  getProducts: (params) => request(`/api/products${toQueryString(params)}`),
  getProduct: (id) => request(`/api/products/${encodeURIComponent(id)}`),
  getRelatedProducts: (id) => request(`/api/products/${encodeURIComponent(id)}/related`),
  getCategories: () => request('/api/categories'),

  login: (credentials) => request('/api/auth/login', { method: 'POST', body: credentials }),
  register: (details) => request('/api/auth/register', { method: 'POST', body: details }),
  me: () => request('/api/auth/me'),

  createOrder: (order) => request('/api/orders', { method: 'POST', body: order }),
  getOrders: (params) => request(`/api/orders${toQueryString(params)}`),
  getOrder: (id) => request(`/api/orders/${encodeURIComponent(id)}`),
  updateOrderStatus: (id, status) => request(`/api/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }),
};
