import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // FIX 1: Check for both 'token' and 'access_token' depending on how your login saves it
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  
  // FIX 2: Safely parse the user object to prevent crashes if the data is corrupted
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Fetch notifications if user is logged in
  useEffect(() => {
    if (!token) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [token, API_BASE_URL]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId, isRead) => {
    if (isRead) return;
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
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
          {currentUser?.role === 'admin' && (
            <Link to="/admin" style={navLinkStyle('/admin')}>Admin HQ</Link>
          )}
          {currentUser?.role === 'donor' && (
            <Link to="/donor" style={navLinkStyle('/donor')}>Donor Portal</Link>
          )}
          {currentUser?.role === 'recipient' && (
            <Link to="/recipient" style={navLinkStyle('/recipient')}>Recipient Sign-Off</Link>
          )}
          
          {/* Public Modules */}
          <Link to="/tracking" style={navLinkStyle('/tracking')}>🛰️ Live Fleet</Link>
          <Link to="/audit" style={navLinkStyle('/audit')}>🛡️ Public Explorer</Link>
        </nav>

        {/* User Session / Notifications / Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {token ? (
            <>
              {/* Notification Bell Menu */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '18px',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '4px',
                  }}
                  title="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        padding: '2px 5px',
                        minWidth: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Container */}
                {showNotifs && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      marginTop: '8px',
                      width: '320px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                      zIndex: 1010,
                      maxHeight: '380px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '14px' }}>Notifications</span>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>{unreadCount} New</span>
                    </div>

                    {notifications.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No notifications found.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => markAsRead(item.id, item.is_read)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #334155',
                            backgroundColor: item.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.08)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: item.is_read ? '#cbd5e1' : '#f8fafc' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                            {item.message}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                            {new Date(item.created_at || Date.now()).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* User Profile Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>{currentUser?.name || currentUser?.email || 'User'}</span>
                <span style={{ color: '#38bdf8', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>
                  {currentUser?.role || ''}
                </span>
              </div>

              {/* Logout Button */}
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