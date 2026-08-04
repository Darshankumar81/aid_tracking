import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import DonorDashboard from './pages/DonorDashboard';
import Login from './pages/Login';
import { getToken, logout } from './api';
import 'leaflet/dist/leaflet.css';

// 1. Protected Route Wrapper with optional Role enforcement
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect non-admins away from admin routes
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// 2. Navigation Bar with Dynamic Auth State & Role Handling
const NavigationBar = () => {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <nav style={{ padding: '1rem', background: '#282c34', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>Aid Tracker</Link>
        {token && (
          user.role === 'admin' ? (
            <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>Admin Dashboard</Link>
          ) : (
            <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Donor Dashboard</Link>
          )
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {token ? (
          <>
            <span style={{ fontSize: '14px', color: '#ccc' }}>
              {user.name || user.email || 'User'} ({user.role || 'Member'})
            </span>
            <button 
              onClick={logout}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: '#4da6ff', textDecoration: 'none', fontWeight: 'bold' }}>Login</Link>
        )}
      </div>
    </nav>
  );
};

// 3. Main App Router
function App() {
  return (
    <Router>
      <NavigationBar />

      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={
          <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1>Welcome to Aid Tracking Platform</h1>
            <p style={{ color: '#555', lineHeight: '1.6' }}>
              Real-time monitoring and logistics tracking for emergency aid shipments, donor contributions, and recipient inventory.
            </p>
          </div>
        } />

        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Admin Dashboard Route (Requires 'admin' role) */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Donor / Member Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DonorDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;