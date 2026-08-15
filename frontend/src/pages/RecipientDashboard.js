import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RecipientDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // OTP Verification Modal State
  const [activeTx, setActiveTx] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const fetchIncomingShipments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('http://127.0.0.1:8000/recipient/shipments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShipments(res.data || []);
    } catch (err) {
      setError('Failed to fetch incoming aid shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomingShipments();
  }, []);

  const handleRequestOtp = async (tx) => {
    try {
      setError('');
      setSuccess('');
      const res = await axios.post(
        'http://127.0.0.1:8000/recipient/generate-otp',
        { transaction_id: tx.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveTx(tx);
      setGeneratedOtp(res.data.otp_code);
      setSuccess(`OTP generated for Shipment #${tx.id}: ${res.data.otp_code}`);
    } catch (err) {
      setError('Failed to generate verification OTP.');
    }
  };

  const handleConfirmVerification = async (e) => {
    e.preventDefault();
    if (!enteredOtp || !activeTx) return;

    try {
      setVerifying(true);
      setError('');
      await axios.post(
        'http://127.0.0.1:8000/recipient/verify-delivery',
        {
          transaction_id: activeTx.id,
          otp_code: enteredOtp
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Shipment #${activeTx.id} verified successfully! Proof-of-delivery logged.`);
      setActiveTx(null);
      setEnteredOtp('');
      setGeneratedOtp('');
      fetchIncomingShipments();
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const styles = {
      pending: { backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
      in_transit: { backgroundColor: '#dbeafe', color: '#2563eb', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
      delivered: { backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
      verified: { backgroundColor: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }
    };
    return <span style={styles[s] || styles.pending}>{s.replace('_', ' ').toUpperCase()}</span>;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>📦 Field Recipient & Proof-of-Delivery Portal</h2>
      <p style={{ color: '#555', marginBottom: '20px' }}>
        Welcome back, <strong>{currentUser.name || 'Field Officer'}</strong>. Confirm and securely verify incoming relief aid.
      </p>

      {error && (
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#065f46', backgroundColor: '#d1fae5', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {/* OTP Confirmation Modal / Box */}
      {activeTx && (
        <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #86efac', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0, color: '#166534' }}>🔐 Confirm Receipt for Shipment #{activeTx.id}</h3>
          <p style={{ fontSize: '14px', color: '#374151', margin: '4px 0 12px 0' }}>
            Item: <strong>{activeTx.product_name || activeTx.aid_type}</strong> | Destination: <strong>{activeTx.destination || activeTx.location}</strong>
          </p>

          {generatedOtp && (
            <div style={{ backgroundColor: '#dcfce7', padding: '10px 14px', borderRadius: '6px', display: 'inline-block', marginBottom: '14px' }}>
              Test Simulation OTP: <strong style={{ fontSize: '18px', letterSpacing: '2px', color: '#15803d' }}>{generatedOtp}</strong>
            </div>
          )}

          <form onSubmit={handleConfirmVerification} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value)}
              required
              maxLength={6}
              style={{ padding: '8px 12px', fontSize: '16px', borderRadius: '4px', border: '1px solid #9ca3af', width: '180px', letterSpacing: '2px' }}
            />
            <button
              type="submit"
              disabled={verifying}
              style={{ padding: '9px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {verifying ? 'Verifying...' : 'Confirm Delivery'}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTx(null); setGeneratedOtp(''); }}
              style={{ padding: '9px 14px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Deliveries Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Incoming & Assigned Deliveries</h3>
        {loading ? (
          <p>Loading shipments...</p>
        ) : shipments.length === 0 ? (
          <p style={{ color: '#666' }}>No active deliveries arriving in your region.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Aid Type</th>
                <th style={{ padding: '10px' }}>Product</th>
                <th style={{ padding: '10px' }}>Destination</th>
                <th style={{ padding: '10px' }}>Units</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '10px' }}>#{tx.id}</td>
                  <td style={{ padding: '10px' }}>{tx.aid_type || tx.type}</td>
                  <td style={{ padding: '10px' }}>{tx.product_name || tx.description || 'Aid Package'}</td>
                  <td style={{ padding: '10px' }}>{tx.destination || tx.location || 'Regional Point'}</td>
                  <td style={{ padding: '10px' }}>{tx.amount}</td>
                  <td style={{ padding: '10px' }}>{getStatusBadge(tx.status)}</td>
                  <td style={{ padding: '10px' }}>
                    {tx.status === 'verified' ? (
                      <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '13px' }}>✓ Verified</span>
                    ) : (
                      <button
                        onClick={() => handleRequestOtp(tx)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Verify with OTP
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
