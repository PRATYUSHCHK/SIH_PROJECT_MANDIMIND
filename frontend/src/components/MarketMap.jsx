import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function colorFor(p) {
  if ((p.oversupplyProb || 0) > 0.4) return '#F59E0B';
  if ((p.shortageProb || 0) > 0.35) return '#DC2626';
  return '#166534';
}

export function MarketMap({ points = [], onSelect }) {
  return (
    <div className="h-[480px] overflow-hidden rounded-mm border border-line">
      <MapContainer center={[17.4, 78.5]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p) => (
          <CircleMarker key={p.slug} center={[p.lat, p.lng]} radius={12} pathOptions={{ color: colorFor(p), fillOpacity: 0.7 }} eventHandlers={{ click: () => onSelect?.(p) }}>
            <Popup>
              <div className="min-w-[180px] text-sm">
                <strong>{p.name}</strong>
                <div>₹{p.currentPriceInr}/kg → ₹{p.predictedPriceInr}</div>
                <div>Arrivals {p.arrivalsKg} kg</div>
                <div>{p.recommendation}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
