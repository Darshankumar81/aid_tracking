import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to fix the common grey map / dimension bug
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
}

const MapView = ({ transactions = [] }) => {
  // Default mock data if transactions array is empty
  const activeData = transactions.length > 0 ? transactions : [
    {
      id: 1,
      donor_name: "Global Food Bank (Delhi)",
      donor_lat: 28.6139,
      donor_lng: 77.2090,
      recipient_name: "Community Care (Mumbai)",
      recipient_lat: 19.0760,
      recipient_lng: 72.8777,
      status: "In Transit"
    }
  ];

  return (
    <div style={{ height: "450px", width: "100%", border: "2px solid #333", borderRadius: "8px" }}>
      <MapContainer 
        center={[23.5937, 78.9629]} 
        zoom={5} 
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapResizer />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {activeData.map((tx, idx) => (
          <React.Fragment key={idx}>
            <Marker position={[tx.donor_lat, tx.donor_lng]}>
              <Popup><strong>Donor:</strong> {tx.donor_name}</Popup>
            </Marker>

            <Marker position={[tx.recipient_lat, tx.recipient_lng]}>
              <Popup><strong>Recipient:</strong> {tx.recipient_name}</Popup>
            </Marker>

            <Polyline 
              positions={[[tx.donor_lat, tx.donor_lng], [tx.recipient_lat, tx.recipient_lng]]} 
              color="blue" 
              dashArray="6, 8"
              weight={4}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;