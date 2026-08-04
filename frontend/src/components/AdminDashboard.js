import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getTransactions, createTransaction, verifyTransaction } from '../api';

// Fix default Leaflet marker icon asset paths for React bundle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Known coordinates for standard logistics hubs
const LOCATION_PRESETS = {
  'New York': [40.7128, -74.0060],
  'Chicago': [41.8781, -87.6298],
  'Los Angeles': [34.0522, -118.2437],
  'Houston': [29.7604, -95.3698],
  'Miami': [25.7617, -80.1918],
  'Bangalore': [12.9716, 77.5946],
  'London': [51.5074, -0.1278]
};

export default function AdminDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [type, setType] = useState('Food & Water');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [locationName, setLocationName] = useState('New York');
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.0060');
  const [submitting, setSubmitting] = useState(false);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTransactions();
      setTransactions(data || []);
    } catch (err) {
      setError('Failed to fetch transactions from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // Quick Preset Selection Handler
  const handleLocationPresetChange = (cityName) => {
    setLocationName(cityName);
    if (LOCATION_PRESETS[cityName]) {
      setLat(LOCATION_PRESETS[cityName][0].toString());
      setLng(LOCATION_PRESETS[cityName][1].toString());
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!productName || !amount) return;

    setSubmitting(true);
    setError('');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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
      // Location Metadata
      location: locationName,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    };

    try {
      await createTransaction(payload);
      setProductName('');
      setAmount('');
      fetchShipments();
    } catch (err) {
      console.error('Dispatch Error:', err.response?.data);
      if (err.response?.data?.detail) {
        const details = err.response.data.detail;
        setError(Array.isArray(details) ? `Missing fields: ${details.map(d => d.loc?.slice(-1)[0]).join(', ')}` : String(details));
      } else {
        setError('Failed to dispatch new aid shipment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (txId) => {
    try {
      await verifyTransaction(txId);
      fetchShipments();
    } catch (err) {
      setError('Failed to verify transaction.');
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

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Aid Tracking Admin Dashboard</h1>

      {error && (
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Dispatch New Aid Form */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Dispatch New Aid Shipment</h3>
        <form onSubmit={handleDispatch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Aid Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Medical Supplies">Medical Supplies</option>
              <option value="Food & Water">Food & Water</option>
              <option value="Shelter & Clothing">Shelter & Clothing</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Product Name</label>
            <input type="text" placeholder="e.g. Dasani Water" value={productName} onChange={(e) => setProductName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Quantity / Units</label>
            <input type="number" placeholder="e.g. 250" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Destination Hub</label>
            <select value={locationName} onChange={(e) => handleLocationPresetChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {Object.keys(LOCATION_PRESETS).map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Latitude</label>
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Longitude</label>
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <button type="submit" disabled={submitting} style={{ padding: '10px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            {submitting ? 'Dispatching...' : 'Dispatch Shipment'}
          </button>
        </form>
      </div>

      {/* Live Map Section */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Live Active Delivery Routes</h3>
        <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={[40.7128, -74.0060]} zoom={3} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            
            {transactions.map((tx, idx) => {
              // Priority: custom database coordinates -> location preset -> default fallback offset
              const itemLat = tx.latitude || (tx.location && LOCATION_PRESETS[tx.location] ? LOCATION_PRESETS[tx.location][0] : 40.7128 + (idx * 1.2));
              const itemLng = tx.longitude || (tx.location && LOCATION_PRESETS[tx.location] ? LOCATION_PRESETS[tx.location][1] : -74.0060 + (idx * 1.2));

              return (
                <Marker key={tx.id || idx} position={[itemLat, itemLng]}>
                  <Popup>
                    <strong>{tx.product_name || tx.aid_type || tx.type}</strong><br />
                    Destination: {tx.location || locationName}<br />
                    Amount: {tx.amount} units<br />
                    Status: {tx.status}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>All Shipments & Transactions</h3>
        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#666' }}>No active transactions found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Product</th>
                <th style={{ padding: '10px' }}>Location</th>
                <th style={{ padding: '10px' }}>Amount</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Action</th>
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
                  <td style={{ padding: '10px' }}>
                    {tx.status !== 'delivered' && tx.status !== 'verified' ? (
                      <button onClick={() => handleVerify(tx.id)} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Verify
                      </button>
                    ) : (
                      <span style={{ color: '#6c757d', fontSize: '12px' }}>Verified</span>
                    )}
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