import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <Router>
      <nav style={{ padding: '1rem', background: '#282c34', color: 'white', display: 'flex', gap: '20px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
        <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>Admin Dashboard</Link>
        <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>Login</Link>
      </nav>

      <Routes>
        <Route path="/" element={<div style={{ padding: '20px' }}><h1>Welcome to Aid Tracking Platform</h1></div>} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;