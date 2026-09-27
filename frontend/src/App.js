import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import DonorDashboard from './pages/DonorDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import LiveTracking from './pages/LiveTracking';
import PublicAuditExplorer from './pages/PublicAuditExplorer';
import Login from './pages/Login';
import LiveNotificationBanner from './components/LiveNotificationBanner';
import { getToken, logout } from './api';
import 'leaflet/dist/leaflet.css';

// Helper for safe JSON parsing from localStorage
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

// 1. Protected Route Wrapper with Role Enforcement
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = getToken();
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if required role doesn't match
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'recipient') return <Navigate to="/recipient" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// 2. Navigation Bar with Active Route Tracking & Dynamic Auth State
const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Reacts to route changes automatically
  const token = getToken();
  const user = getStoredUser();

  const handleLogout = () => {
    if (typeof logout === 'function') {
      logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  const getNavLinkStyle = (path) => ({
    color: location.pathname === path ? '#38bdf8' : '#cbd5e1',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: location.pathname === path ? '700' : '500',
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: location.pathname === path ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
  });

  return (
    <nav style={{ padding: '0.8rem 1.5rem', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🌍</span> Aid<span style={{ color: '#38bdf8' }}>Tracker</span>
        </Link>
        
        {/* Role-Specific Dashboard Links */}
        {token && (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" style={getNavLinkStyle('/admin')}>Admin HQ</Link>
            )}
            {user.role === 'donor' && (
              <Link to="/dashboard" style={getNavLinkStyle('/dashboard')}>Donor Portal</Link>
            )}
            {user.role === 'recipient' && (
              <Link to="/recipient" style={getNavLinkStyle('/recipient')}>Recipient Sign-Off</Link>
            )}
          </>
        )}

        {/* Public Modules */}
        <Link to="/tracking" style={getNavLinkStyle('/tracking')}>🛰️ Live Fleet</Link>
        <Link to="/audit" style={getNavLinkStyle('/audit')}>🛡️ Public Explorer</Link>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {token ? (
          <>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              <strong style={{ color: '#f8fafc' }}>{user.name || user.email || 'User'}</strong> ({user.role ? user.role.toUpperCase() : 'MEMBER'})
            </span>
            <button 
              onClick={handleLogout}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ backgroundColor: '#0284c7', color: 'white', textDecoration: 'none', fontWeight: 'bold', padding: '6px 16px', borderRadius: '4px', fontSize: '13px' }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

// 3. Main App Router
export default function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
        <NavigationBar />

        <div style={{ flex: 1 }}>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={
              <div style={{ padding: '64px 24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
                <h1 style={{ color: '#f8fafc', fontSize: '36px', marginBottom: '16px', fontWeight: '800' }}>
                  Humanitarian Aid Transparency & Logistics Platform
                </h1>
                <p style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '18px' }}>
                  Real-time monitoring and transparent supply-chain logistics for emergency relief aid, multi-hub routing (Bangalore, Mumbai, Delhi), live GPS fleet simulation, and cryptographically verified proof-of-delivery receipts.
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap' }}>
                  <Link to="/tracking" style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    View Live Fleet Tracker 🛰️
                  </Link>
                  <Link to="/audit" style={{ padding: '12px 24px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    Open Public Audit Explorer 🛡️
                  </Link>
                </div>
              </div>
            } />

            {/* Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Role Protected Dashboard Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="donor">
                <DonorDashboard />
              </ProtectedRoute>
            } />

            <Route path="/recipient" element={
              <ProtectedRoute requiredRole="recipient">
                <RecipientDashboard />
              </ProtectedRoute>
            } />

            {/* Public Modules */}
            <Route path="/tracking" element={<LiveTracking />} />
            <Route path="/audit" element={<PublicAuditExplorer />} />

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Live WebSocket Broadcast Banner */}
        <LiveNotificationBanner />
      </div>
    </Router>
  );
}