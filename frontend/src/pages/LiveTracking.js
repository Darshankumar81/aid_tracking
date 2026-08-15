import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// Custom Vehicle Truck Icon for Leaflet Map
const truckIcon = new L.DivIcon({
  className: 'custom-truck-icon',
  html: `<div style="background-color: #2563eb; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 10px rgba(37,99,235,0.6); border: 2px solid #fff;">🚚</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

export default function LiveTracking() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLivePositions = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/tracking/live-fleet');
      setFleet(res.data || []);
    } catch (err) {
      console.error('Failed to fetch fleet telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePositions();
    // 2-second telemetry polling loop
    const interval = setInterval(fetchLivePositions, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>🛰️ Live GPS Fleet Telemetry & Transit Simulator</h1>
      <p style={{ color: '#64748b', marginTop: '-6px' }}>
        Real-time telemetry stream updating delivery vehicles moving between regional distributing hubs and recipient destinations.
      </p>

      {/* Live Active Fleet Cards */}
      {loading && fleet.length === 0 ? (
        <p>Loading fleet telemetry...</p>
      ) : fleet.length === 0 ? (
        <p style={{ color: '#64748b' }}>No active vehicles currently in transit or staged.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '20px 0' }}>
          {fleet.map((vehicle) => (
            <div key={vehicle.transaction_id} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '15px' }}>Shipment #{vehicle.transaction_id}</strong>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: vehicle.status === 'IN_TRANSIT' ? '#dbeafe' : '#fef3c7', color: vehicle.status === 'IN_TRANSIT' ? '#2563eb' : '#d97706', fontWeight: 'bold' }}>
                  {vehicle.status}
                </span>
              </div>
              <p style={{ margin: '6px 0', fontSize: '13px', color: '#334155' }}><strong>Item:</strong> {vehicle.product_name}</p>
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b' }}>Route: {vehicle.origin_hub} → {vehicle.destination}</p>
              
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Route Progress</span>
                  <strong>{vehicle.progress_percentage}%</strong>
                </div>
                <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${vehicle.progress_percentage}%`, backgroundColor: '#2563eb', height: '100%', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <span>Speed: <strong>{vehicle.speed_kmh} km/h</strong></span>
                <span>ETA: <strong>{vehicle.eta_minutes} mins</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map Simulator */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Active Fleet Locations (Live Movement)</h3>
        <div style={{ height: '480px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

            {fleet.map((vehicle) => (
              <Marker key={vehicle.transaction_id} position={[vehicle.current_lat, vehicle.current_lng]} icon={truckIcon}>
                <Popup>
                  <strong>🚚 Delivery Truck #{vehicle.transaction_id}</strong><br />
                  Item: {vehicle.product_name}<br />
                  Route: {vehicle.origin_hub} → {vehicle.destination}<br />
                  Progress: {vehicle.progress_percentage}% | ETA: {vehicle.eta_minutes} min
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}