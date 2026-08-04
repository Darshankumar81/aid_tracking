import React, { useEffect, useState } from 'react';
import { getTransactions, createTransaction, verifyTransaction, logout } from '../api';

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Modal State for Dispatching New Shipments
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    aid_type: 'medical',
    product_name: '',
    amount: '',
  });

  useEffect(() => {
    // 1. Retrieve logged-in user details from localStorage safely
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // Fallback default role
        setUser({ role: 'admin', name: 'Admin User' });
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
      setUser({ role: 'admin', name: 'Admin User' });
    }

    // 2. Fetch live transactions from FastAPI
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    getTransactions()
      .then((data) => {
        setTransactions(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load transactions:', err);
        setLoading(false);
      });
  };

  // Handler for verifying a transaction (Admin only)
  const handleVerify = async (txId) => {
    setActionLoading((prev) => ({ ...prev, [txId]: true }));
    try {
      await verifyTransaction(txId);
      // Update local state to reflect verification status
      setTransactions((prev) =>
        prev.map((tx) => {
          const currentId = tx.id || tx._id;
          return currentId === txId ? { ...tx, status: 'verified', is_verified: true } : tx;
        })
      );
    } catch (err) {
      alert(`Failed to verify transaction #${txId}`);
      console.error(err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [txId]: false }));
    }
  };

  // Handler for Modal Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for Submitting New Shipment
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.amount) {
      alert('Please fill out all required fields.');
      return;
    }

    setModalSubmitting(true);
    try {
      await createTransaction({
        aid_type: formData.aid_type,
        product_name: formData.product_name,
        amount: Number(formData.amount),
        status: 'in_transit',
      });

      // Refresh list & reset modal
      fetchData();
      setIsModalOpen(false);
      setFormData({ aid_type: 'medical', product_name: '', amount: '' });
    } catch (err) {
      console.error('Failed to create shipment:', err);
      alert('Error dispatching shipment. Please try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h3>Loading dashboard...</h3>
      </div>
    );
  }

  const role = user?.role || 'admin';

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Aid Tracking Dashboard</h2>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Logged in as: <strong>{user?.name || user?.email || 'User'}</strong> ({role.toUpperCase()})
          </span>
        </div>
        <button 
          onClick={logout} 
          style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
        >
          Logout
        </button>
      </div>

      {/* Role-Specific Banner */}
      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', marginBottom: '24px', borderLeft: '4px solid #007bff' }}>
        {role === 'admin' && <p style={{ margin: 0 }}><strong>Admin View:</strong> Complete system overview. You can verify transactions, track active routes, and dispatch new aid packages.</p>}
        {role === 'donor' && <p style={{ margin: 0 }}><strong>Donor View:</strong> Showing aid packages donated by your organization and their real-time delivery status.</p>}
        {role === 'recipient' && <p style={{ margin: 0 }}><strong>Recipient View:</strong> Showing incoming shipments allocated to your center and expected arrival updates.</p>}
      </div>

      {/* Role-Specific Actions */}
      {role === 'admin' && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ padding: '10px 18px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Dispatch New Shipment
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <h3>{role === 'admin' ? 'All Transactions' : role === 'donor' ? 'My Donations' : 'Incoming Shipments'}</h3>
      
      {transactions.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>No shipments found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f1f1f1', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Type</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Product / Details</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Amount</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
              {role === 'admin' && <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const txId = tx.id || tx._id;
              return (
                <tr key={txId}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>#{txId}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textTransform: 'capitalize' }}>{tx.aid_type || 'N/A'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{tx.product_name || 'N/A'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{tx.amount}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: tx.status === 'delivered' || tx.status === 'verified' ? '#d4edda' : tx.status === 'in_transit' ? '#fff3cd' : '#e2e3e5',
                      color: tx.status === 'delivered' || tx.status === 'verified' ? '#155724' : tx.status === 'in_transit' ? '#856404' : '#383d41'
                    }}>
                      {tx.status}
                    </span>
                  </td>
                  {role === 'admin' && (
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {tx.status !== 'verified' && tx.status !== 'delivered' ? (
                        <button 
                          onClick={() => handleVerify(txId)}
                          disabled={actionLoading[txId]}
                          style={{ padding: '4px 8px', fontSize: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          {actionLoading[txId] ? 'Verifying...' : 'Verify'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#28a745' }}>✓ Verified</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Dispatch Modal Overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ marginTop: 0 }}>Dispatch New Shipment</h3>
            <form onSubmit={handleDispatchSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Aid Type:</label>
                <select 
                  name="aid_type" 
                  value={formData.aid_type} 
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="medical">Medical Supplies</option>
                  <option value="food">Food & Water</option>
                  <option value="shelter">Shelter & Clothing</option>
                  <option value="general">General Logistics</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Product Name:</label>
                <input 
                  type="text" 
                  name="product_name" 
                  value={formData.product_name} 
                  onChange={handleInputChange} 
                  placeholder="e.g. First Aid Kits"
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Quantity / Amount:</label>
                <input 
                  type="number" 
                  name="amount" 
                  value={formData.amount} 
                  onChange={handleInputChange} 
                  placeholder="e.g. 500"
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 14px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={modalSubmitting}
                  style={{ padding: '8px 14px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {modalSubmitting ? 'Dispatching...' : 'Submit Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;