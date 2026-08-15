import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getTransactions, createTransaction } from '../api';

// Fix default Leaflet marker icon asset paths for React bundle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const DISTRIBUTING_HUBS = {
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore Central Hub',
    coords: [12.9716, 77.5946],
    color: '#8b5cf6'
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai West Hub',
    coords: [19.0760, 72.8777],
    color: '#06b6d4'
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi North Hub',
    coords: [28.6139, 77.2090],
    color: '#ec4899'
  }
};

// Haversine algorithm: finds closest hub to given target coordinates
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
            data.address.state ||
            'Selected Location';
          setLocationName(place);
        }
      } catch (err) {
        setLocationName(`Target (${clickedLat}, ${clickedLng})`);
      }
    }
  });
  return null;
}

export default function DonorDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [type, setType] = useState('Medical Supplies');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [selectedHub, setSelectedHub] = useState('bangalore');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchMyShipments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTransactions();
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

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentLat = parseFloat(pos.coords.latitude.toFixed(4));
        const currentLng = parseFloat(pos.coords.longitude.toFixed(4));
        setLat(currentLat);
        setLng(currentLng);
        setMapCenter([currentLat, currentLng]);

        const closest = getNearestHub(currentLat, currentLng);
        setSelectedHub(closest.id);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}`
          );
          const data = await res.json();
          if (data && data.address) {
            setLocationName(data.address.city || data.address.town || data.address.state || 'My Current Location');
          }
        } catch (err) {
          setLocationName(`Current GPS (${currentLat}, ${currentLng})`);
        }
      },
      (err) => console.error('GPS Detection Error:', err)
    );
  };

  const handlePledgeSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !amount || !locationName) return;

    setSubmitting(true);
    setError('');

    let finalLat = parseFloat(lat);
    let finalLng = parseFloat(lng);
    let activeHub = selectedHub;

    // Force geocoding resolution if coordinates are missing or invalid
    if (isNaN(finalLat) || isNaN(finalLng) || !finalLat || !finalLng) {
      const geoResult = await geocodeLocation(locationName);
      if (geoResult) {
        finalLat = geoResult.lat;
        finalLng = geoResult.lng;
        activeHub = geoResult.hubId;
      } else {
        // Fallback geocoordinates based on text destination match
        if (locationName.toLowerCase().includes('lucknow') || locationName.toLowerCase().includes('delhi')) {
          finalLat = 26.8467;
          finalLng = 80.9462;
          activeHub = 'delhi';
        } else if (locationName.toLowerCase().includes('mumbai') || locationName.toLowerCase().includes('pune')) {
          finalLat = 19.0760;
          finalLng = 72.8777;
          activeHub = 'mumbai';
        } else {
          finalLat = 12.9141;
          finalLng = 74.8560;
          activeHub = 'bangalore';
        }
      }
    } else {
      activeHub = getNearestHub(finalLat, finalLng).id;
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
      longitude: Number(finalLng)
    };

    try {
      await createTransaction(payload);
      setProductName('');
      setAmount('');
      setLocationName('');
      setLat('');
      setLng('');
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
      verified: { backgroundColor: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }
    };
    return <span style={styles[s] || styles.pending}>{s.replace('_', ' ').toUpperCase()}</span>;
  };

  const totalUnitsDonated = transactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Donor Portal & Multi-Hub Contribution Dashboard</h2>
      <p style={{ color: '#555', marginBottom: '20px' }}>
        Welcome back, <strong>{currentUser.name || currentUser.email || 'Donor'}</strong>. Shipments route through our national logistics network.
      </p>

      {error && (
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Network Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #007bff' }}>
          <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>My Total Contributions</span>
          <h2 style={{ margin: '6px 0 0', color: '#007bff' }}>{totalUnitsDonated} Units</h2>
        </div>
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
          <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Active Hub Network</span>
          <h2 style={{ margin: '6px 0 0', color: '#8b5cf6' }}>3 Regional Centers (BLR, BOM, DEL)</h2>
        </div>
      </div>

      {/* Pledge Form */}
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
            <input type="text" placeholder="e.g. Blankets" value={productName} onChange={(e) => setProductName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Quantity</label>
            <input type="number" placeholder="e.g. 100" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              Target Destination {geocoding && <span style={{ color: '#28a745' }}>(Locating...)</span>}
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input 
                type="text" 
                placeholder="e.g. Lucknow, Pune, Mangalore" 
                value={locationName} 
                onChange={(e) => setLocationName(e.target.value)} 
                onBlur={() => geocodeLocation(locationName)} 
                required 
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
              <button 
                type="button" 
                onClick={() => geocodeLocation(locationName)} 
                style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🔍
              </button>
              <button 
                type="button" 
                onClick={handleDetectGPS} 
                title="Detect My Location" 
                style={{ padding: '8px 12px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                📍
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Routing Distributing Hub</label>
            <select 
              value={selectedHub} 
              onChange={(e) => setSelectedHub(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f0fdf4' }}
            >
              {Object.entries(DISTRIBUTING_HUBS).map(([key, hub]) => (
                <option key={key} value={key}>{hub.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} style={{ padding: '10px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            {submitting ? 'Submitting...' : 'Pledge Contribution'}
          </button>
        </form>
      </div>

      {/* Multi-Hub Map */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>📍 National Multi-Hub Delivery Routes</h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '-8px', marginBottom: '16px' }}>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>══ Purple Line:</span> Leg 1 (Donor Origin $\rightarrow$ Regional Hub) | 
          <span style={{ color: '#2563eb', fontWeight: 'bold', marginLeft: '8px' }}>══ Colored Line:</span> Leg 2 (Regional Hub $\rightarrow$ Final Destination)
        </p>
        <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={mapCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={mapCenter} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <MapClickSelector setLat={setLat} setLng={setLng} setLocationName={setLocationName} setSelectedHub={setSelectedHub} />

            {/* Distributing Hub Markers */}
            {Object.values(DISTRIBUTING_HUBS).map((hub) => (
              <Marker key={hub.id} position={hub.coords}>
                <Popup><strong>🏭 {hub.name}</strong></Popup>
              </Marker>
            ))}

            {transactions.map((tx, idx) => {
              const destLat = parseFloat(tx.latitude) || 12.9141;
              const destLng = parseFloat(tx.longitude) || 74.8560;
              const destCoords = [destLat, destLng];

              const hub = getNearestHub(destLat, destLng);
              const donorCoords = [
                tx.donor?.latitude || hub.coords[0] + 0.4 + (idx * 0.05),
                tx.donor?.longitude || hub.coords[1] - 0.4 - (idx * 0.05)
              ];

              const outboundColor = tx.status === 'delivered' || tx.status === 'verified'
                ? '#10b981'
                : tx.status === 'in_transit'
                  ? '#3b82f6'
                  : '#f59e0b';

              return (
                <React.Fragment key={tx.id || idx}>
                  {/* Leg 1: Inbound to Nearest Regional Hub */}
                  <Polyline 
                    positions={[donorCoords, hub.coords]} 
                    pathOptions={{ color: '#8b5cf6', weight: 2, dashArray: '4, 6' }} 
                  />

                  {/* Leg 2: Outbound from Hub to Target Destination */}
                  <Polyline 
                    positions={[hub.coords, destCoords]} 
                    pathOptions={{ color: outboundColor, weight: 3, dashArray: '8, 8' }} 
                  />

                  {/* Target Destination Marker */}
                  <Marker position={destCoords}>
                    <Popup>
                      <strong>{tx.product_name || tx.aid_type}</strong><br />
                      Destination: {parseLocation(tx)}<br />
                      Routed via: <strong>{hub.name}</strong><br />
                      Status: <strong>{(tx.status || 'pending').toUpperCase()}</strong>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* History Table */}
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
                <th style={{ padding: '10px' }}>Transit Hub</th>
                <th style={{ padding: '10px' }}>Amount</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const assignedHub = getNearestHub(tx.latitude, tx.longitude);
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '10px' }}>#{tx.id}</td>
                    <td style={{ padding: '10px' }}>{tx.aid_type || tx.type}</td>
                    <td style={{ padding: '10px' }}>{tx.product_name || tx.description || 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{parseLocation(tx)}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 'bold' }}>
                        {assignedHub.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>{tx.amount}</td>
                    <td style={{ padding: '10px' }}>{getStatusBadge(tx.status)}</td>
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