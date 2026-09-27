import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function RecipientSignOff() {
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncoming = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/transactions/');
      const data = await res.json();
      setIncoming(data);
    } catch (err) {
      console.error('Error fetching incoming shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncoming();
  }, []);

  const confirmReceipt = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/transactions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delivered' }),
      });
      if (res.ok) {
        setIncoming((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'Delivered' } : item))
        );
      }
    } catch (err) {
      console.error('Sign-off failed:', err);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>Recipient Verification & Sign-Off</h1>
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Inspect incoming aid shipments and confirm physical delivery receipt
        </p>
      </header>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading incoming deliveries...</p>
      ) : (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>Shipment ID</th>
                <th style={{ padding: '12px 16px' }}>Cargo</th>
                <th style={{ padding: '12px 16px' }}>Quantity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Sign-Off Action</th>
              </tr>
            </thead>
            <tbody>
              {incoming.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #334155', fontSize: '14px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{item.id}</td>
                  <td style={{ padding: '12px 16px' }}>{item.product_name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.status === 'Delivered' ? (
                      <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>
                        ✓ Verified Received
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmReceipt(item.id)}
                        style={{
                          backgroundColor: '#22c55e',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px',
                        }}
                      >
                        Confirm Receipt
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
  );
}