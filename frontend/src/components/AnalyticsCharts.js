// src/components/AnalyticsCharts.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const AnalyticsCharts = ({ shipments = [] }) => {
  // Aggregate quantities by Aid Type
  const chartData = shipments.reduce((acc, curr) => {
    const type = curr.aid_type || 'General';
    const existing = acc.find((item) => item.type === type);
    if (existing) {
      existing.amount += Number(curr.amount || 0);
    } else {
      acc.push({ type, amount: Number(curr.amount || 0) });
    }
    return acc;
  }, []);

  return (
    <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>Aid Volumes by Category</h3>
      {chartData.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>No shipment data to chart.</p>
      ) : (
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#007bff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCharts;