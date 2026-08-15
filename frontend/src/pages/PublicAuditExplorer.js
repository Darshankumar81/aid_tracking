import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PublicAuditExplorer() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('http://127.0.0.1:8000/audit/ledger');
      setLedger(res.data || []);
    } catch (err) {
      setError('Unable to load public audit ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const filteredLedger = ledger.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.transaction_id.toString().includes(term) ||
      item.product_name.toLowerCase().includes(term) ||
      item.destination.toLowerCase().includes(term) ||
      item.donor_name.toLowerCase().includes(term) ||
      item.proof_hash.toLowerCase().includes(term)
    );
  });

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
    <div style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>🛡️ Public Transparency & Aid Audit Explorer</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Open-access, cryptographically verifiable ledger of all humanitarian aid transactions, chain-of-custody tracking, and proof-of-delivery timestamps.
        </p>
      </div>

      {error && (
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Quick Search Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search by Shipment ID, Item, Destination, Donor, or Hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '600px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        />
        <button
          onClick={fetchLedger}
          style={{ padding: '12px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
        >
          Refresh Ledger
        </button>
      </div>

      {/* Selected Shipment Modal / Detail Box */}
      {selectedTx && (
        <div style={{ backgroundColor: '#f8fafc', border: '2px solid #3b82f6', borderRadius: '12px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 12px rgba(59,130,246,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>
                Verified Shipment #{selectedTx.transaction_id}: {selectedTx.product_name}
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Category: {selectedTx.aid_type} | Quantity: <strong>{selectedTx.amount} units</strong></span>
            </div>
            <button
              onClick={() => setSelectedTx(null)}
              style={{ backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕ Close
            </button>
          </div>

          {/* Cryptographic Hash Badge */}
          <div style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px', borderRadius: '8px', margin: '16px 0', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>SHA-256 Proof-of-Delivery Hash:</span><br />
            {selectedTx.proof_hash}
          </div>

          {/* Chain-of-Custody Visual Timeline */}
          <h4 style={{ margin: '18px 0 12px 0', color: '#334155' }}>🔗 Chain-of-Custody Timeline</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {selectedTx.chain_of_custody.map((step, idx) => (
              <div key={idx} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${step.status === 'COMPLETED' || step.status === 'VERIFIED' ? '#10b981' : step.status === 'IN_PROGRESS' ? '#3b82f6' : '#94a3b8'}` }}>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Step {idx + 1}</span>
                <p style={{ margin: '4px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{step.stage}</p>
                <span style={{ fontSize: '12px', color: '#475569' }}>{step.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Ledger Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>Verified Transaction Records ({filteredLedger.length})</h3>
        {loading ? (
          <p>Loading ledger entries...</p>
        ) : filteredLedger.length === 0 ? (
          <p style={{ color: '#64748b' }}>No matching records found in the audit registry.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Item Pledged</th>
                <th style={{ padding: '12px' }}>Donor</th>
                <th style={{ padding: '12px' }}>Target Destination</th>
                <th style={{ padding: '12px' }}>Quantity</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Cryptographic Proof</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((tx) => (
                <tr key={tx.transaction_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>#{tx.transaction_id}</td>
                  <td style={{ padding: '12px' }}>
                    <strong>{tx.product_name}</strong><br />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{tx.aid_type}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{tx.donor_name}</td>
                  <td style={{ padding: '12px' }}>{tx.destination}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{tx.amount}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(tx.status)}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => setSelectedTx(tx)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#0ea5e9',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Verify Audit Proof ↗
                    </button>
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