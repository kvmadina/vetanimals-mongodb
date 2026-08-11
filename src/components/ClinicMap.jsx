import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPinIcon } from './Icons.jsx'

// Custom marker: emerald pin with a white paw, styled inline (divIcon HTML is
// not processed by Tailwind, and this avoids leaflet's broken default assets).
const pawPin = L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(15,23,42,0.35))">
      <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:#047857;border:3px solid #ffffff;box-sizing:border-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
          <ellipse cx="4.8" cy="10.6" rx="2.1" ry="2.7"/>
          <ellipse cx="9.9" cy="6.9" rx="2.1" ry="2.7"/>
          <ellipse cx="14.1" cy="6.9" rx="2.1" ry="2.7"/>
          <ellipse cx="19.2" cy="10.6" rx="2.1" ry="2.7"/>
          <ellipse cx="12" cy="15.6" rx="4.6" ry="3.6"/>
        </svg>
      </div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #047857"></div>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
})

/**
 * Interactive clinic location map. Coordinates MUST come from
 * clinics.latitude / clinics.longitude — never hardcoded. When either is
 * missing or invalid, a graceful fallback panel is shown instead.
 * @param {{ clinic: object, className?: string }}
 */
export default function ClinicMap({ clinic, className = '' }) {
  const lat = Number(clinic?.latitude)
  const lng = Number(clinic?.longitude)
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (lat !== 0 || lng !== 0)

  if (!hasCoords) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center ${className}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-xs">
          <MapPinIcon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-semibold text-slate-700">Map unavailable</p>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
          No location data is available for this clinic yet.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-64 w-full sm:h-80"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={pawPin}>
          <Popup>
            <strong>{clinic.name}</strong>
            <br />
            {clinic.address}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
