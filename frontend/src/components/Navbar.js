import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkStyle = (path) => ({
    color: isActive(path) ? '#38bdf8' : '#cbd5e1',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: isActive(path) ? 'bold' : '500',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: isActive(path) ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
  });

  return (
    <header style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🌍</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', letterSpacing: '0.5px' }}>
            Aid<span style={{ color: '#38bdf8' }}>Tracker</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {currentUser.role === 'admin' && (
            <Link to="/admin" style={navLinkStyle('/admin')}>Admin HQ</Link>
          )}
          {currentUser.role === 'donor' && (
            <Link to="/donor" style={navLinkStyle('/donor')}>Donor Portal</Link>
          )}
          {currentUser.role === 'recipient' && (
            <Link to="/recipient" style={navLinkStyle('/recipient')}>Recipient Sign-Off</Link>
          )}
          
          {/* Public Modules */}
          <Link to="/tracking" style={navLinkStyle('/tracking')}>🛰️ Live Fleet</Link>
          <Link to="/audit" style={navLinkStyle('/audit')}>🛡️ Public Explorer</Link>
        </nav>

        {/* User Session / Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {token ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>{currentUser.name || currentUser.email}</span>
                <span style={{ color: '#38bdf8', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>
                  {currentUser.role || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#ef4444')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#334155')}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              style={{
                padding: '6px 16px',
                backgroundColor: '#0284c7',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}