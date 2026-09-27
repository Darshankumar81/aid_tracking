import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function AdminHQ() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchShipments = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/transactions/');
      const data = await res.json();
      setShipments(data);
    } catch (err) {
      console.error('Error loading shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/transactions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setShipments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredShipments = shipments.filter((item) =>
    filter === 'ALL' ? true : item.status === filter
  );

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>Admin Command Center</h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Manage shipment dispatch and broadcast live status updates
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            padding: '8px 12px',
            borderRadius: '6px',
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Delayed">Delayed</option>
        </select>
      </header>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading shipments...</p>
      ) : (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Item</th>
                <th style={{ padding: '12px 16px' }}>Quantity</th>
                <th style={{ padding: '12px 16px' }}>Destination</th>
                <th style={{ padding: '12px 16px' }}>Current Status</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} style={{ borderBottom: '1px solid #334155', fontSize: '14px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{shipment.id}</td>
                  <td style={{ padding: '12px 16px' }}>{shipment.product_name}</td>
                  <td style={{ padding: '12px 16px' }}>{shipment.quantity}</td>
                  <td style={{ padding: '12px 16px' }}>{shipment.destination}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={shipment.status}
                      onChange={(e) => handleStatusUpdate(shipment.id, e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        border: '1px solid #475569',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <option value="Pending">Set Pending</option>
                      <option value="In Transit">Set In Transit</option>
                      <option value="Delivered">Set Delivered</option>
                      <option value="Delayed">Set Delayed</option>
                    </select>
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