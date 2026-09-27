import React from 'react';

export function StatusBadge({ status }) {
  const styles = {
    Pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', icon: '⏳' },
    'In Transit': { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', icon: '🚚' },
    Delivered: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', icon: '✅' },
    Delayed: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', icon: '⚠️' },
  }[status] || { bg: '#334155', text: '#94a3b8', icon: 'ℹ️' };

  return (
    <span
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        border: `1px solid ${styles.text}33`,
      }}
    >
      <span>{styles.icon}</span> {status}
    </span>
  );
}

export default StatusBadge;