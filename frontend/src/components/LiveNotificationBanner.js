import React, { useState, useEffect } from 'react';

export default function LiveNotificationBanner({ onUpdateReceived }) {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/shipments');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'STATUS_UPDATED') {
          setNotification(data);
          if (onUpdateReceived) onUpdateReceived(data);

          // Auto-dismiss after 6 seconds
          setTimeout(() => {
            setNotification(null);
          }, 6000);
        }
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [onUpdateReceived]);

  if (!notification) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#0f172a',
      color: '#fff',
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      borderLeft: '4px solid #38bdf8',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span style={{ fontSize: '20px' }}>🔔</span>
      <div>
        <strong style={{ display: 'block', fontSize: '13px', color: '#38bdf8' }}>
          Live Status Broadcast
        </strong>
        <span style={{ fontSize: '13px', color: '#f8fafc' }}>
          Shipment #{notification.transaction_id} ({notification.product_name}) is now <strong>{notification.new_status}</strong>
        </span>
      </div>
      <button
        onClick={() => setNotification(null)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '16px',
          marginLeft: '8px'
        }}
      >
        ✕
      </button>
    </div>
  );
}