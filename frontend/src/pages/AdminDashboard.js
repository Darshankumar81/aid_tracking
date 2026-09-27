import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getTransactions, createTransaction } from '../api';
import axios from 'axios';

// Fix default Leaflet marker icon asset paths for React bundle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Distributing Hubs Network Definition
export const DISTRIBUTING_HUBS = {
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore Central Hub',
    coords: [12.9716, 77.5946],
    color: '#8b5cf6',
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai West Hub',
    coords: [19.0760, 72.8777],
    color: '#06b6d4',
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi North Hub',
    coords: [28.6139, 77.2090],
    color: '#ec4899',
  },
};

// Haversine Algorithm to determine nearest transit hub
export const getNearestHub = (lat, lng) => {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) return DISTRIBUTING_HUBS.bangalore;

  const toRad = (v) => (v * Math.PI) / 180;
  let minDistance = Infinity;
  let nearest = DISTRIBUTING_HUBS.bangalore;

  Object.values(DISTRIBUTING_HUBS).forEach((hub) => {
    const dLat = toRad(hub.coords[0] - parsedLat);
    const dLng = toRad(hub.coords[1] - parsedLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(parsedLat)) * Math.cos(toRad(hub.coords[0])) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const dist = 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

    if (dist < minDistance) {
      minDistance = dist;
      nearest = hub;
    }
  });
  return nearest;
};

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 5);
    }
  }, [center, map]);
  return null;
}

const parseLocation = (tx) => {
  if (tx.location && tx.location !== 'N/A' && tx.location !== 'null') return tx.location;
  if (tx.destination && tx.destination !== 'N/A' && tx.destination !== 'null') return tx.destination;
  if (tx.target_location && tx.target_location !== 'N/A') return tx.target_location;

  if (tx.description && tx.description.includes('(') && tx.description.includes(')')) {
    const parts = tx.description.split('(');
    const extracted = parts[parts.length - 1].replace(')', '').trim();
    if (extracted && extracted.toLowerCase() !== (tx.product_name || '').toLowerCase()) {
      return extracted;
    }
  }

  if (tx.latitude && tx.longitude) {
    return `${tx.latitude}, ${tx.longitude}`;
  }

  return 'Regional Destination';
};

function MapClickSelector({ setLat, setLng, setLocationName, setSelectedHub }) {
  useMapEvents({
    async click(e) {
      const clickedLat = parseFloat(e.latlng.lat.toFixed(4));
      const clickedLng = parseFloat(e.latlng.lng.toFixed(4));
      setLat(clickedLat);
      setLng(clickedLng);

      const closest = getNearestHub(clickedLat, clickedLng);
      setSelectedHub(closest.id);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLat}&lon=${clickedLng}`
        );
        const data = await res.json();
        if (data && data.address) {
          const place =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county ||
            data.address.state ||
            'Selected Target';
          setLocationName(place);
        }
      } catch (err) {
        setLocationName(`Target (${clickedLat}, ${clickedLng})`);
      }
    },
  });
  return null;
}

export default function AdminDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [type, setType] = useState('Food & Water');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [selectedHub, setSelectedHub] = useState('bangalore');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

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

  const geocodeLocation = async (query) => {
    if (!query || query.trim().length < 2) return null;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);

        setLat(foundLat.toFixed(4));
        setLng(foundLng.toFixed(4));
        setMapCenter([foundLat, foundLng]);

        const closest = getNearestHub(foundLat, foundLng);
        setSelectedHub(closest.id);

        return { lat: foundLat, lng: foundLng, hubId: closest.id };
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    } finally {
      setGeocoding(false);
    }
    return null;
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!productName || !amount || !locationName) return;

    setSubmitting(true);
    setError('');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    let finalLat = parseFloat(lat);
    let finalLng = parseFloat(lng);
    let activeHub = selectedHub;

    // Force geocoding if lat/lng are missing or invalid
    if (isNaN(finalLat) || isNaN(finalLng) || !finalLat || !finalLng) {
      const geoResult = await geocodeLocation(locationName);
      if (geoResult) {
        finalLat = geoResult.lat;
        finalLng = geoResult.lng;
        activeHub = geoResult.hubId;
      } else {
        // Safe fallback for queries if geocoding fails
        finalLat = 26.8467; // Lucknow
        finalLng = 80.9462;
        activeHub = 'delhi';
      }
    }

    const payload = {
      aid_type: type,
      type: type,
      item_type: type,

      product_name: productName,
      item_name: productName,
      description: `${productName} (${locationName}) [Via ${DISTRIBUTING_HUBS[activeHub].name}]`,

      amount: parseFloat(amount),
      quantity: parseInt(amount, 10),

      status: 'pending',
      donor_id: currentUser.id || 1,
      recipient_id: 1,

      location: locationName,
      destination: locationName,
      target_location: locationName,
      latitude: Number(finalLat),
      longitude: Number(finalLng),
    };

    try {
      await createTransaction(payload);
      setProductName('');
      setAmount('');
      setLocationName('');
      setLat('');
      setLng('');
      fetchShipments();
    } catch (err) {
      console.error('Dispatch Error:', err.response?.data);
      setError('Failed to dispatch new aid shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Inline Status Update Handler
  const handleStatusChange = async (txId, newStatus) => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      await axios.put(
        `http://127.0.0.1:8000/transactions/${txId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchShipments();
    } catch (err) {
      console.error('Status update failed:', err);
      setError(`Failed to update status for shipment #${txId}.`);
    }
  };

  // Multi-Hub Inventory Stock Aggregation
  const getHubBreakdown = () => {
    const counts = {
      bangalore: { total: 0, pending: 0, in_transit: 0, delivered: 0 },
      mumbai: { total: 0, pending: 0, in_transit: 0, delivered: 0 },
      delhi: { total: 0, pending: 0, in_transit: 0, delivered: 0 },
    };

    transactions.forEach((tx) => {
      const val = parseFloat(tx.amount) || 0;
      const status = (tx.status || 'pending').toLowerCase();
      const hub = getNearestHub(tx.latitude, tx.longitude);
      const hubKey = hub.id;

      if (counts[hubKey]) {
        counts[hubKey].total += val;
        if (status === 'pending') counts[hubKey].pending += val;
        else if (status === 'in_transit') counts[hubKey].in_transit += val;
        else counts[hubKey].delivered += val;
      }
    });

    return counts;
  };

  const hubBreakdown = getHubBreakdown();

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#d9dbdd', marginBottom: '20px' }}>
        Aid Tracking Admin & National Logistics Center
      </h1>

      {error && (
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {/* Regional Distributing Hubs Inventory Summary */}
      <div style={{ backgroundColor: '#ffffff', color: '#1e293b', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>🏭 Regional Distributing Centers Network Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {Object.entries(DISTRIBUTING_HUBS).map(([key, hub]) => {
            const data = hubBreakdown[key] || { total: 0, pending: 0, in_transit: 0, delivered: 0 };
            return (
              <div key={key} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', borderTop: `4px solid ${hub.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>{hub.name}</h4>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Staged at Hub:</span>
                    <strong style={{ color: '#d97706' }}>{data.pending.toLocaleString()} units</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Outbound In-Transit:</span>
                    <strong style={{ color: '#2563eb' }}>{data.in_transit.toLocaleString()} units</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Successfully Delivered:</span>
                    <strong style={{ color: '#059669' }}>{data.delivered.toLocaleString()} units</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dispatch New Aid Form */}
      <div style={{ backgroundColor: '#ffffff', color: '#1e293b', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>Dispatch New Aid Shipment</h3>
        <form onSubmit={handleDispatch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}>Aid Category</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#1e293b', backgroundColor: '#fff' }}>
              <option value="Medical Supplies">Medical Supplies</option>
              <option value="Food & Water">Food & Water</option>
              <option value="Shelter & Clothing">Shelter & Clothing</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}>Product Name</label>
            <input type="text" placeholder="e.g. First Aid Kits" value={productName} onChange={(e) => setProductName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#1e293b', backgroundColor: '#fff' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}>Quantity / Units</label>
            <input type="number" placeholder="e.g. 250" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#1e293b', backgroundColor: '#fff' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}>
              Destination / City Name {geocoding && <span style={{ color: '#007bff' }}>(Locating...)</span>}
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input 
                type="text" 
                placeholder="e.g. Mangalore, Jaipur, Pune" 
                value={locationName} 
                onChange={(e) => setLocationName(e.target.value)} 
                onBlur={() => geocodeLocation(locationName)}
                required 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#1e293b', backgroundColor: '#fff' }} 
              />
              <button 
                type="button" 
                onClick={() => geocodeLocation(locationName)} 
                style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔍
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}>Transit Hub</label>
            <select 
              value={selectedHub} 
              onChange={(e) => setSelectedHub(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f0fdf4', color: '#1e293b' }}
            >
              {Object.entries(DISTRIBUTING_HUBS).map(([key, hub]) => (
                <option key={key} value={key}>{hub.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} style={{ padding: '10px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            {submitting ? 'Dispatching...' : 'Dispatch Shipment'}
          </button>
        </form>
      </div>

      {/* Multi-Stage Route Map */}
      <div style={{ backgroundColor: '#ffffff', color: '#1e293b', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>📍 National Aid Distribution Routes (Multi-Hub Logistics)</h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '-8px', marginBottom: '16px' }}>
          <span style={{ color: '#9333ea', fontWeight: 'bold' }}>══ Purple Line:</span> Leg 1 (Donor Origin → Regional Hub) | 
          <span style={{ color: '#2563eb', fontWeight: 'bold', marginLeft: '8px' }}>══ Colored Line:</span> Leg 2 (Regional Hub → Final Destination)
        </p>
        <div style={{ height: '420px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={mapCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={mapCenter} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            
            <MapClickSelector setLat={setLat} setLng={setLng} setLocationName={setLocationName} setSelectedHub={setSelectedHub} />

            {/* Distributing Hub Markers */}
            {Object.values(DISTRIBUTING_HUBS).map((hub) => (
              <Marker key={hub.id} position={hub.coords}>
                <Popup>
                  <div style={{ color: '#000' }}>
                    <strong>🏭 {hub.name}</strong><br />
                    Staged Stock: {(hubBreakdown[hub.id]?.pending || 0).toLocaleString()} units
                  </div>
                </Popup>
              </Marker>
            ))}

            {transactions.map((tx, idx) => {
              const destLat = parseFloat(tx.latitude) || 12.9141;
              const destLng = parseFloat(tx.longitude) || 74.8560;
              const destCoords = [destLat, destLng];

              const hub = getNearestHub(destLat, destLng);
              const donorCoords = [
                tx.donor?.latitude || hub.coords[0] + 0.5 + (idx * 0.05),
                tx.donor?.longitude || hub.coords[1] - 0.5 - (idx * 0.05),
              ];

              const outboundColor = tx.status === 'delivered' || tx.status === 'verified'
                ? '#10b981'
                : tx.status === 'in_transit'
                  ? '#3b82f6'
                  : '#f59e0b';

              return (
                <React.Fragment key={tx.id || idx}>
                  {/* Leg 1: Donor -> Hub */}
                  <Polyline 
                    positions={[donorCoords, hub.coords]} 
                    pathOptions={{ color: '#9333ea', weight: 2, dashArray: '4, 6' }} 
                  />

                  {/* Leg 2: Hub -> Final Destination */}
                  <Polyline 
                    positions={[hub.coords, destCoords]} 
                    pathOptions={{ color: outboundColor, weight: 3, dashArray: '8, 8' }} 
                  />

                  {/* Final Target Marker */}
                  <Marker position={destCoords}>
                    <Popup>
                      <div style={{ color: '#000' }}>
                        <strong>{tx.product_name || tx.aid_type || tx.type}</strong><br />
                        Destination: {parseLocation(tx)}<br />
                        Assigned Hub: <strong>{hub.name}</strong><br />
                        Quantity: {tx.amount} units<br />
                        Status: <strong>{(tx.status || 'pending').toUpperCase()}</strong>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Transactions Data Table with Dropdown Status Control */}
      <div style={{ backgroundColor: '#ffffff', color: '#1e293b', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>All System Shipments & Assigned Transit Hubs</h3>
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#64748b' }}>No active transactions found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', color: '#1e293b' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#1e293b' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Product</th>
                <th style={{ padding: '10px' }}>Destination</th>
                <th style={{ padding: '10px' }}>Assigned Hub</th>
                <th style={{ padding: '10px' }}>Units</th>
                <th style={{ padding: '10px' }}>Status Control</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const assignedHub = getNearestHub(tx.latitude, tx.longitude);
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #dee2e6', color: '#1e293b' }}>
                    <td style={{ padding: '10px', color: '#1e293b' }}>#{tx.id}</td>
                    <td style={{ padding: '10px', color: '#1e293b' }}>{tx.aid_type || tx.type}</td>
                    <td style={{ padding: '10px', color: '#1e293b' }}>{tx.product_name || tx.description || 'N/A'}</td>
                    <td style={{ padding: '10px', color: '#1e293b' }}>{parseLocation(tx)}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 'bold' }}>
                        {assignedHub.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#1e293b' }}>{tx.amount}</td>
                    <td style={{ padding: '10px' }}>
                      <select
                        value={tx.status ? tx.status.toLowerCase() : 'pending'}
                        onChange={(e) => handleStatusChange(tx.id, e.target.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          border: '1px solid #ccc',
                          backgroundColor: 
                            tx.status === 'delivered' || tx.status === 'verified' 
                              ? '#d1fae5' 
                              : tx.status === 'in_transit' 
                                ? '#dbeafe' 
                                : '#fef3c7',
                          color: 
                            tx.status === 'delivered' || tx.status === 'verified' 
                              ? '#059669' 
                              : tx.status === 'in_transit' 
                                ? '#2563eb' 
                                : '#d97706',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="pending">PENDING (At Hub)</option>
                        <option value="in_transit">IN TRANSIT (Outbound)</option>
                        <option value="delivered">DELIVERED (At Target)</option>
                        <option value="verified">VERIFIED (Received)</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}