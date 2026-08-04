import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getTransactions, createTransaction } from '../api';

// Fix default Leaflet marker icon asset paths for React bundle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LOCATION_PRESETS = {
  'New York': [40.7128, -74.0060],
  'Chicago': [41.8781, -87.6298],
  'Los Angeles': [34.0522, -118.2437],
  'Houston': [29.7604, -95.3698],
  'Miami': [25.7617, -80.1918],
  'Bangalore': [12.9716, 77.5946],
  'London': [51.5074, -0.1278]
};

export default function DonorDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Pledge Form State
  const [type, setType] = useState('Medical Supplies');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [locationName, setLocationName] = useState('New York');
  const [submitting, setSubmitting] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchMyShipments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTransactions();
      
      // Filter transactions belonging to current donor if donor_id matches, or fallback to all user items
      const myItems = (data || []).filter(
        (tx) => tx.donor_id === currentUser.id || !tx.donor_id
      );
      setTransactions(myItems.length > 0 ? myItems : data || []);
    } catch (err) {
      setError('Failed to load aid contributions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyShipments();
  }, []);

  const handlePledgeSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !amount) return;

    setSubmitting(true);
    setError('');

    const presetCoords = LOCATION_PRESETS[locationName] || [40.7128, -74.0060];

    const payload = {
      aid_type: type,
      type: type,
      product_name: productName,
      description: `${productName} (${locationName})`,
      amount: parseFloat(amount),
      quantity: parseInt(amount, 10),
      status: 'pending',
      donor_id: currentUser.id || 1,
      recipient_id: 1,
      location: locationName,
      latitude: presetCoords[0],
      longitude: presetCoords[1]
    };

    try {
      await createTransaction(payload);
      setProductName('');
      setAmount('');
      fetchMyShipments();
    } catch (err) {
      console.error('Pledge submission error:', err.response?.data);
      setError('Failed to pledge aid shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const styles = {
      pending: { backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
      in_transit: { backgroundColor: '#dbeafe', color: '#2563eb', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
      delivered: { backgroundColor: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
      verified: { backgroundColor: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
    };
    return <span style={styles[s] || styles.pending}>{s.replace('_', ' ').toUpperCase()}</span>;
  };

  const totalUnitsDonated = transactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Donor Portal & Aid Contribution Dashboard</h2>
      <p style={{ color: '#555', marginBottom: '20px' }}>
        Welcome back, <strong>{currentUser.name || currentUser.email || 'Donor'}</strong>. Track your aid shipments in real-time.
      </p>

      {error && (
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #007bff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Total Contributions</span>
          <h2 style={{ margin: '8px 0 0', color: '#007bff' }}>{transactions.length} Shipments</h2>
        </div>
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #28a745', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Total Volume Pledged</span>
          <h2 style={{ margin: '8px 0 0', color: '#28a745' }}>{totalUnitsDonated} Units</h2>
        </div>
      </div>

      {/* Pledge Aid Form */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Pledge & Dispatch New Aid</h3>
        <form onSubmit={handlePledgeSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Aid Category</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Medical Supplies">Medical Supplies</option>
              <option value="Food & Water">Food & Water</option>
              <option value="Shelter & Clothing">Shelter & Clothing</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Item Description</label>
            <input type="text" placeholder="e.g. Bottled Water Cases" value={productName} onChange={(e) => setProductName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Quantity / Units</label>
            <input type="number" placeholder="e.g. 100" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Target Logistics Hub</label>
            <select value={locationName} onChange={(e) => setLocationName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {Object.keys(LOCATION_PRESETS).map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} style={{ padding: '10px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            {submitting ? 'Submitting...' : 'Pledge Contribution'}
          </button>
        </form>
      </div>

      {/* Live Map Section */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>My Active Shipments Map</h3>
        <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={[40.7128, -74.0060]} zoom={3} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            {transactions.map((tx, idx) => {
              const itemLat = tx.latitude || (tx.location && LOCATION_PRESETS[tx.location] ? LOCATION_PRESETS[tx.location][0] : 40.7128 + (idx * 0.8));
              const itemLng = tx.longitude || (tx.location && LOCATION_PRESETS[tx.location] ? LOCATION_PRESETS[tx.location][1] : -74.0060 + (idx * 0.8));

              return (
                <Marker key={tx.id || idx} position={[itemLat, itemLng]}>
                  <Popup>
                    <strong>{tx.product_name || tx.aid_type || tx.type}</strong><br />
                    Destination Hub: {tx.location || locationName}<br />
                    Amount: {tx.amount} units<br />
                    Status: {tx.status}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Contributions Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Contribution History</h3>
        {loading ? (
          <p>Loading contributions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#666' }}>No contributions found yet. Submit a pledge above to start tracking!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Item</th>
                <th style={{ padding: '10px' }}>Destination</th>
                <th style={{ padding: '10px' }}>Amount</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '10px' }}>#{tx.id}</td>
                  <td style={{ padding: '10px' }}>{tx.aid_type || tx.type}</td>
                  <td style={{ padding: '10px' }}>{tx.product_name || tx.description || 'N/A'}</td>
                  <td style={{ padding: '10px' }}>{tx.location || 'New York'}</td>
                  <td style={{ padding: '10px' }}>{tx.amount}</td>
                  <td style={{ padding: '10px' }}>{getStatusBadge(tx.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}