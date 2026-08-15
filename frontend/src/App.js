import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import DonorDashboard from './pages/DonorDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import LiveTracking from './pages/LiveTracking';
import PublicAuditExplorer from './pages/PublicAuditExplorer';
import Login from './pages/Login';
import LiveNotificationBanner from './components/LiveNotificationBanner';
import { getToken, logout } from './api';
import 'leaflet/dist/leaflet.css';

// 1. Protected Route Wrapper with Role Enforcement
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if a specific role is required and doesn't match
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'recipient') return <Navigate to="/recipient" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// 2. Navigation Bar with Dynamic Auth State & All Modules
const NavigationBar = () => {
  const navigate = useNavigate();
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    if (typeof logout === 'function') {
      logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  const navLinkStyle = {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    padding: '6px 12px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  };

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
              <Link to="/admin" style={{ ...navLinkStyle, color: '#38bdf8', fontWeight: 'bold' }}>Admin HQ</Link>
            )}
            {user.role === 'donor' && (
              <Link to="/dashboard" style={{ ...navLinkStyle, color: '#38bdf8', fontWeight: 'bold' }}>Donor Portal</Link>
            )}
            {user.role === 'recipient' && (
              <Link to="/recipient" style={{ ...navLinkStyle, color: '#38bdf8', fontWeight: 'bold' }}>Recipient Sign-Off</Link>
            )}
          </>
        )}

        {/* Public Modules (Accessible by Everyone) */}
        <Link to="/tracking" style={navLinkStyle}>🛰️ Live Fleet</Link>
        <Link to="/audit" style={navLinkStyle}>🛡️ Public Explorer</Link>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
        <NavigationBar />

        <div style={{ flex: 1 }}>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={
              <div style={{ padding: '48px 24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
                <h1 style={{ color: '#0f172a', fontSize: '32px', marginBottom: '12px' }}>Humanitarian Aid Transparency & Logistics Platform</h1>
                <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '16px' }}>
                  Real-time monitoring and transparent supply-chain logistics for emergency relief aid, multi-hub routing (Bangalore, Mumbai, Delhi), live GPS fleet simulation, and cryptographically verified proof-of-delivery receipts.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                  <Link to="/tracking" style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    View Live Fleet Tracker 🛰️
                  </Link>
                  <Link to="/audit" style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    Open Public Audit Explorer 🛡️
                  </Link>
                </div>
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

            {/* Donor / Member Dashboard Route (Requires 'donor' role) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="donor">
                  <DonorDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Recipient Dashboard Route (Requires 'recipient' role) */}
            <Route 
              path="/recipient" 
              element={
                <ProtectedRoute requiredRole="recipient">
                  <RecipientDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Public Live Telemetry Tracking */}
            <Route path="/tracking" element={<LiveTracking />} />

            {/* Public Cryptographic Proof & Ledger Audit */}
            <Route path="/audit" element={<PublicAuditExplorer />} />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Live WebSocket Broadcast Banner */}
        <LiveNotificationBanner />
      </div>
    </Router>
  );
}