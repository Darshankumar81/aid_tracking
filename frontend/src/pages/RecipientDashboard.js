import React, { useState, useEffect } from 'react';
import axios from 'axios';; // or standard axios instance with Auth token header

export default function RecipientDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTx, setActiveTx] = useState(null); // Selected transaction for OTP verification
  const [otpInput, setOtpInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null); // For local preview/testing
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIncomingShipments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://127.0.0.1:8000/recipients/shipments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShipments(res.data || []);
    } catch (err) {
      console.error('Failed to load recipient shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomingShipments();
  }, []);

  // 1. Request OTP Generation & Dispatch
  const handleRequestOTP = async (tx) => {
    setActiveTx(tx);
    setOtpInput('');
    setGeneratedCode(null);
    setStatusMsg({ type: 'info', text: 'Generating and dispatching 6-digit OTP...' });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://127.0.0.1:8000/recipients/generate-otp',
        { transaction_id: tx.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.otp_code) {
        setGeneratedCode(res.data.otp_code);
      }
      setStatusMsg({ type: 'success', text: res.data.message || 'OTP dispatched to registered Email & Phone!' });
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to dispatch OTP. Please try again.';
      setStatusMsg({ type: 'error', text: errMsg });
    }
  };

  // 2. Submit OTP to Verify Delivery
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.length < 6) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid 6-digit OTP code.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg({ type: 'info', text: 'Verifying proof of delivery...' });

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://127.0.0.1:8000/recipients/verify-delivery',
        {
          transaction_id: activeTx.id,
          otp_code: otpInput
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatusMsg({ type: 'success', text: `Shipment #${activeTx.id} verified successfully!` });
      setTimeout(() => {
        setActiveTx(null);
        fetchIncomingShipments();
      }, 1500);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Invalid or expired OTP. Please check and retry.';
      setStatusMsg({ type: 'error', text: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
          Recipient Verification Portal
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
          Inspect incoming relief supplies and confirm delivery handshakes using cryptographic OTP verification.
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>TOTAL INCOMING</span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{shipments.length}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600' }}>IN TRANSIT</span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
            {shipments.filter(s => s.status === 'IN_TRANSIT').length}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>VERIFIED DELIVERIES</span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
            {shipments.filter(s => s.status === 'VERIFIED').length}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Assigned Relief Consignments</h2>
          <button onClick={fetchIncomingShipments} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading consignment records...</div>
        ) : shipments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No active consignments pending confirmation.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>ID</th>
                  <th style={{ padding: '14px 20px' }}>Product</th>
                  <th style={{ padding: '14px 20px' }}>Quantity</th>
                  <th style={{ padding: '14px 20px' }}>Route</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>#{tx.id}</td>
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>{tx.product_name || 'Aid Package'}</td>
                    <td style={{ padding: '16px 20px', color: '#334155' }}>{tx.quantity} units</td>
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>
                      {tx.origin_hub || 'Hub'} → <strong style={{ color: '#0f172a' }}>{tx.destination || 'Destination'}</strong>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: tx.status === 'VERIFIED' ? '#dcfce7' : tx.status === 'IN_TRANSIT' ? '#dbeafe' : '#fef3c7',
                        color: tx.status === 'VERIFIED' ? '#15803d' : tx.status === 'IN_TRANSIT' ? '#1d4ed8' : '#b45309'
                      }}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {tx.status === 'VERIFIED' ? (
                        <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>✓ Verified</span>
                      ) : (
                        <button
                          onClick={() => handleRequestOTP(tx)}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          🔑 Verify OTP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {activeTx && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                Verify Delivery #{activeTx.id}
              </h3>
              <button
                onClick={() => setActiveTx(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0, marginBottom: '20px', lineHeight: '1.5' }}>
              A 6-digit security OTP was sent to your registered Email and Phone. Enter it below to issue a cryptographic sign-off.
            </p>

            {statusMsg.text && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
                backgroundColor: statusMsg.type === 'error' ? '#fef2f2' : statusMsg.type === 'success' ? '#f0fdf4' : '#eff6ff',
                color: statusMsg.type === 'error' ? '#991b1b' : statusMsg.type === 'success' ? '#166534' : '#1e40af',
                border: `1px solid ${statusMsg.type === 'error' ? '#fecaca' : statusMsg.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`
              }}>
                {statusMsg.text}
              </div>
            )}

            {/* Simulated OTP Code Display Badge */}
            {generatedCode && (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  DEV PREVIEW (SIMULATION MODE)
                </span>
                <strong style={{ fontSize: '24px', letterSpacing: '6px', color: '#2563eb' }}>
                  {generatedCode}
                </strong>
              </div>
            )}

            <form onSubmit={handleVerifyOTP}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 849201"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '22px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '2px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTx(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}