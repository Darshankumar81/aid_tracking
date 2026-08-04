import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      API.get('/me')
        .then((res) => setUser(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // --- Step 1: Request OTP ---
  const requestOtp = async (email, password) => {
    const res = await API.post(
      `/login/request-otp?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    );
    return res.data;
  };

  // --- Step 2: Verify OTP & Store JWT Token ---
  const verifyOtp = async (email, code) => {
    const res = await API.post(
      `/login/verify-otp?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`
    );
    const accessToken = res.data.access_token;

    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(res.data.user);
    return res.data;
  };

  // Direct OAuth2 form login (for fallback / admin login without OTP)
  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await API.post('/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = res.data.access_token;
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, requestOtp, verifyOtp, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);