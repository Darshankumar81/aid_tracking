import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Custom Vehicle Truck Icon with Pulsing Effect
const truckIcon = new L.DivIcon({
  className: 'custom-truck-icon',
  html: `
    <div style="
      position: relative;
      background-color: #2563eb;
      color: white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);
      border: 2px solid #ffffff;
    ">
      🚚
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

export default function LiveTracking() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLivePositions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/tracking/live-fleet`);
      setFleet(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch fleet telemetry:', err);
      setError('Unable to connect to live telemetry stream.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePositions();
    const interval = setInterval(fetchLivePositions, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter out any invalid coordinate payloads from backend
  const activeVehicles = fleet.filter(
    (v) => v.current_lat != null && v.current_lng != null
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0, fontWeight: '800', color: '#38bdf8' }}>
          🛰️ Live GPS Fleet Telemetry & Transit Simulator
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '15px' }}>
          Real-time telemetry stream updating delivery vehicles moving between regional distribution hubs and recipient destinations.
        </p>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Live Active Fleet Metrics Cards */}
      {loading && fleet.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Loading live fleet telemetry...</p>
      ) : fleet.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No active vehicles currently in transit or staged.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {fleet.map((vehicle) => (
            <div 
              key={vehicle.transaction_id} 
              style={{ 
                backgroundColor: '#1e293b', 
                padding: '18px', 
                borderRadius: '10px', 
                border: '1px solid #334155', 
                borderLeft: '4px solid #38bdf8',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '15px', color: '#f8fafc' }}>Shipment #{vehicle.transaction_id}</strong>
                <span style={{ 
                  fontSize: '11px', 
                  padding: '3px 10px', 
                  borderRadius: '12px', 
                  backgroundColor: vehicle.status === 'IN_TRANSIT' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                  color: vehicle.status === 'IN_TRANSIT' ? '#38bdf8' : '#fbbf24', 
                  fontWeight: 'bold',
                  border: vehicle.status === 'IN_TRANSIT' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  {vehicle.status}
                </span>
              </div>

              <p style={{ margin: '8px 0 4px 0', fontSize: '14px', color: '#e2e8f0' }}>
                <strong>Cargo:</strong> {vehicle.product_name}
              </p>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#94a3b8' }}>
                Route: {vehicle.origin_hub} → {vehicle.destination}
              </p>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: '#cbd5e1' }}>
                  <span>Progress</span>
                  <strong>{vehicle.progress_percentage || 0}%</strong>
                </div>
                <div style={{ width: '100%', backgroundColor: '#0f172a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${vehicle.progress_percentage || 0}%`, 
                    backgroundColor: '#0284c7', 
                    height: '100%', 
                    transition: 'width 0.5s ease-in-out' 
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                <span>Speed: <strong style={{ color: '#f8fafc' }}>{vehicle.speed_kmh || 0} km/h</strong></span>
                <span>ETA: <strong style={{ color: '#f8fafc' }}>{vehicle.eta_minutes || 0} mins</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Map Section */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#f8fafc', fontSize: '18px' }}>
          🗺️ Active Fleet Positioning
        </h3>
        <div style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer 
 url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
  attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ' 
/>
            

            {activeVehicles.map((vehicle) => (
              <Marker 
                key={vehicle.transaction_id} 
                position={[vehicle.current_lat, vehicle.current_lng]} 
                icon={truckIcon}
              >
                <Popup>
                  <div style={{ color: '#0f172a', fontFamily: 'sans-serif' }}>
                    <strong style={{ fontSize: '14px' }}>🚚 Delivery Truck #{vehicle.transaction_id}</strong><br />
                    <span style={{ fontSize: '12px' }}><strong>Cargo:</strong> {vehicle.product_name}</span><br />
                    <span style={{ fontSize: '12px' }}><strong>Route:</strong> {vehicle.origin_hub} → {vehicle.destination}</span><br />
                    <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #cbd5e1' }} />
                    <span style={{ fontSize: '12px' }}><strong>Progress:</strong> {vehicle.progress_percentage}%</span><br />
                    <span style={{ fontSize: '12px' }}><strong>ETA:</strong> {vehicle.eta_minutes} min</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}