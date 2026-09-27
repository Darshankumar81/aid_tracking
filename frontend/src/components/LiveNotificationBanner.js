import React, { useState, useEffect, useRef } from 'react';

export default function LiveNotificationBanner({ onUpdateReceived }) {
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);
  const callbackRef = useRef(onUpdateReceived);

  // Keep callback reference fresh without triggering WebSocket reconnects
  useEffect(() => {
    callbackRef.current = onUpdateReceived;
  }, [onUpdateReceived]);

  useEffect(() => {
    let ws = null;

    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:8000/ws/shipments');

      ws.onopen = () => {
        console.log('📡 WebSocket Connected: /ws/shipments');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.event === 'STATUS_UPDATED') {
            setNotification(data);

            if (callbackRef.current) {
              callbackRef.current(data);
            }

            // Clear any active dismiss timer before setting a new one
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }

            // Auto-dismiss after 6 seconds
            timerRef.current = setTimeout(() => {
              setNotification(null);
            }, 6000);
          }
        } catch (err) {
          console.error('WS Parse Error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket encountered an error:', err);
      };
    };

    connect();

    // Clean up timer and socket connection on component unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (ws) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
  }, []); // Empty dependency array ensures single connection creation

  if (!notification) return null;

  return (
    <div
      style={{
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
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: '20px' }}>🔔</span>
      <div>
        <strong style={{ display: 'block', fontSize: '13px', color: '#38bdf8' }}>
          Live Status Broadcast
        </strong>
        <span style={{ fontSize: '13px', color: '#f8fafc' }}>
          Shipment #{notification.transaction_id} ({notification.product_name}) is now{' '}
          <strong>{notification.new_status}</strong>
        </span>
      </div>
      <button
        onClick={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          setNotification(null);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '16px',
          marginLeft: '8px',
        }}
      >
        ✕
      </button>
    </div>
  );
}