import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MapView from '../components/MapView';

const AdminDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    // 1. Initial REST fetch for authenticating & getting initial data
    axios.get('http://127.0.0.1:8000/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setTransactions(res.data);
      setLoading(false);
    })
    .catch(err => {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    });

    // 2. Open WebSocket for real-time tracking updates
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/tracking');

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsLive(true);
    };

    ws.onmessage = (event) => {
      const liveData = JSON.parse(event.data);
      setTransactions(liveData);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsLive(false);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsLive(false);
    };

    // Cleanup connection when component unmounts
    return () => {
      ws.close();
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Admin Aid Tracking Dashboard</h2>
          <span style={{
            fontSize: '12px', 
            padding: '4px 8px', 
            borderRadius: '12px', 
            background: isLive ? '#28a745' : '#6c757d', 
            color: 'white'
          }}>
            {isLive ? '● Live WebSocket Stream Active' : 'Offline'}
          </span>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
      
      {loading ? <p>Loading map and transactions...</p> : <MapView transactions={transactions} />}

      <h3 style={{ marginTop: '30px' }}>Active Aid Transactions</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Donor</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Recipient</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Donor Lat / Lng</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i}>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{t.donor_name}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{t.recipient_name}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{t.status}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                {t.donor_lat.toFixed(4)}, {t.donor_lng.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;