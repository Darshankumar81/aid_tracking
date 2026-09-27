import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function DonorPortal() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/transactions/')
      .then((res) => res.json())
      .then((data) => {
        setShipments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  const totalAllocated = shipments.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const activeShipments = shipments.filter((item) => item.status === 'In Transit').length;
  const deliveredShipments = shipments.filter((item) => item.status === 'Delivered').length;

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>Donor Transparency Portal</h1>
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Real-time tracking of aid funding deployment and delivery status
        </p>
      </header>

      {/* Metric KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>TOTAL AID ALLOCATED</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#38bdf8' }}>{totalAllocated.toLocaleString()} Units</p>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>IN TRANSIT</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#f59e0b' }}>{activeShipments} Shipments</p>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>COMPLETED DELIVERIES</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#22c55e' }}>{deliveredShipments} Shipments</p>
        </div>
      </div>

      {/* Shipment Ledger */}
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading donor ledger...</p>
      ) : (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>Shipment ID</th>
                <th style={{ padding: '12px 16px' }}>Aid Item</th>
                <th style={{ padding: '12px 16px' }}>Allocated Quantity</th>
                <th style={{ padding: '12px 16px' }}>Destination Hub</th>
                <th style={{ padding: '12px 16px' }}>Fulfillment Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id} style={{ borderBottom: '1px solid #334155', fontSize: '14px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{shipment.id}</td>
                  <td style={{ padding: '12px 16px' }}>{shipment.product_name}</td>
                  <td style={{ padding: '12px 16px' }}>{shipment.quantity}</td>
                  <td style={{ padding: '12px 16px' }}>{shipment.destination}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={shipment.status} />
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