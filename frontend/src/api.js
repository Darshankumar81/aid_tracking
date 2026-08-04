import axios from 'axios';

// Fallback to environment variables if present (Create React App format)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// 1. Centralized Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15-second request timeout safeguard
});

// Helper utilities for local storage management
export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// 2. Request Interceptor: Attach JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: Global 401 Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthData();

      // Avoid redirect loops if the user is already on auth routes
      const authRoutes = ['/login', '/register'];
      const currentPath = window.location.pathname;

      if (!authRoutes.some((route) => currentPath.startsWith(route))) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// AUTHENTICATION & OTP HELPERS
// -------------------------------------------------------------

/**
 * Step 1: Validate credentials and trigger 6-digit OTP code creation
 */
export const requestOtp = async (email, password) => {
  const response = await api.post(
    `/login/request-otp?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
  );
  return response.data;
};

/**
 * Step 2: Submit 6-digit OTP to verify login and store token
 */
export const verifyOtp = async (email, code) => {
  const response = await api.post(
    `/login/verify-otp?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`
  );

  if (response.data?.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  if (response.data?.user) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

/**
 * Direct Log in user (Fallback / OAuth2 standard login)
 */
export const login = async (email, password, isOAuthForm = true) => {
  let payload;
  let headers = {};

  if (isOAuthForm) {
    // FastAPI OAuth2 requirement: MUST use 'username' for email
    payload = new URLSearchParams();
    payload.append('username', email); 
    payload.append('password', password);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    payload = { email, password };
  }

  const response = await api.post('/login', payload, { headers });

  if (response.data?.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  if (response.data?.user) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
  const response = await api.post('/register', userData);
  return response.data;
};

/**
 * Fetch current logged-in user profile from backend
 */
export const getCurrentUser = async () => {
  const response = await api.get('/me');
  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response.data;
};

/**
 * Log out user by purging local state
 */
export const logout = () => {
  clearAuthData();
  window.location.href = '/login';
};

// -------------------------------------------------------------
// USER HELPERS
// -------------------------------------------------------------

/**
 * Fetch all users (Admin/Staff only)
 */
export const getUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

// -------------------------------------------------------------
// TRANSACTION HELPERS
// -------------------------------------------------------------

/**
 * Fetch list of transactions (Filtered by user role server-side)
 */
export const getTransactions = async (params = {}) => {
  const response = await api.get('/transactions', { params });
  return response.data;
};

/**
 * Fetch a single transaction by ID
 */
export const getTransactionById = async (txId) => {
  const response = await api.get(`/transactions/${txId}`);
  return response.data;
};

/**
 * Create a new aid transaction / shipment
 */
export const createTransaction = async (transactionData) => {
  const response = await api.post('/transactions/', transactionData);
  return response.data;
};

/**
 * Verify a transaction (Admin only)
 */
export const verifyTransaction = async (txId) => {
  const response = await api.put(`/transactions/${txId}/verify`);
  return response.data;
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (txId, newStatus) => {
  const response = await api.put(`/transactions/${txId}/status`, null, {
    params: { status_param: newStatus },
  });
  return response.data;
};

/**
 * Delete or cancel a transaction
 */
export const deleteTransaction = async (txId) => {
  const response = await api.delete(`/transactions/${txId}`);
  return response.data;
};

export default api;