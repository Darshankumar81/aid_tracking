import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/transactions')
      .then((res) => setTransactions(res.data))
      .catch((err) => console.error('Error fetching transactions:', err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', text: '#d97706' },
      in_transit: { bg: '#dbeafe', text: '#2563eb' },
      delivered: { bg: '#dcfce7', text: '#16a34a' },
    };
    const style = colors[status] || colors.pending;
    return (
      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: style.bg, color: style.text }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Aid Transactions Dashboard</h2>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>
            Logged in as <strong>{user?.name}</strong> ({user?.role})
          </p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {loading ? (
        <p>Loading transactions...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Aid Type</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Donor</th>
              <th style={thStyle}>Recipient</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={tdStyle}>#{tx.id}</td>
                <td style={tdStyle}><strong>{tx.aid_type}</strong></td>
                <td style={tdStyle}>{tx.product_name}</td>
                <td style={tdStyle}>{tx.amount}</td>
                <td style={tdStyle}>{tx.donor ? tx.donor.name : 'N/A'}</td>
                <td style={tdStyle}>{tx.recipient ? tx.recipient.name : 'Unassigned'}</td>
                <td style={tdStyle}>{getStatusBadge(tx.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: '12px', fontSize: '14px', color: '#475569' };
const tdStyle = { padding: '12px', fontSize: '14px' };