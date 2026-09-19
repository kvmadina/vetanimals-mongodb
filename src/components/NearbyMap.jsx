import { Component, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// react-leaflet's MapContainer only reads center/zoom on mount, so a later
// change (e.g. geolocation resolving after the map rendered) would be ignored.
// This child recenters the map whenever its props change.
function SetViewOnChange({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: false })
  }, [map, center, zoom])
  return null
}

function buildPin(color, iconSvg, size = 32) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(15,23,42,0.35))">
        <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #ffffff;box-sizing:border-box">
          ${iconSvg}
        </div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color}"></div>
      </div>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  })
}

const clinicPin = buildPin(
  '#047857',
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><ellipse cx="4.8" cy="10.6" rx="2.1" ry="2.7"/><ellipse cx="9.9" cy="6.9" rx="2.1" ry="2.7"/><ellipse cx="14.1" cy="6.9" rx="2.1" ry="2.7"/><ellipse cx="19.2" cy="10.6" rx="2.1" ry="2.7"/><ellipse cx="12" cy="15.6" rx="4.6" ry="3.6"/></svg>`,
)

const storePin = buildPin(
  '#d97706',
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
)

const userPin = buildPin(
  '#2563eb',
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="#ffffff"/><circle cx="12" cy="12" r="3" fill="#2563eb"/></svg>`,
  28,
)

function ExternalLink({ href, children }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 block text-xs font-semibold text-emerald-700 hover:text-emerald-800"
    >
      {children}
    </a>
  )
}

function ClinicPopup({ clinic }) {
  return (
    <div className="w-52">
      <p className="text-sm font-bold text-slate-900">{clinic.name}</p>
      <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
        <span>📍</span>
        {clinic.address || 'Address unavailable'}
      </p>
      {clinic.phone && <p className="mt-1 text-xs text-slate-500">📞 {clinic.phone}</p>}
      <ExternalLink href={clinic.website}>
        {clinic.website ? clinic.website.replace(/^https?:\/\//, '') : null}
      </ExternalLink>
      <div className="mt-2 flex gap-2">
        <Link
          to={`/clinics/${clinic.id}`}
          className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
        >
          View clinic
        </Link>
        <Link
          to="/appointments/new"
          state={{ clinicId: clinic.id, clinicName: clinic.name }}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Book appointment
        </Link>
      </div>
    </div>
  )
}

function StorePopup({ store }) {
  return (
    <div className="w-52">
      <p className="text-sm font-bold text-slate-900">{store.name}</p>
      <p className="mt-0.5 text-xs text-slate-500">{store.address || 'Address unavailable'}</p>
      {store.phone && <p className="mt-1 text-xs text-slate-500">📞 {store.phone}</p>}
      <ExternalLink href={store.website}>{store.website ? store.website.replace(/^https?:\/\//, '') : null}</ExternalLink>
      <a
        href={`https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lng}#map=17/${store.lat}/${store.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 block text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        Open in OpenStreetMap →
      </a>
    </div>
  )
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('[NearbyMap] Map failed to render:', error)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
          <div className="px-6">
            <p className="text-sm font-semibold text-slate-700">Map unavailable</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              The map couldn&apos;t load right now. The list below still shows nearby places.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Interactive map showing clinics (VetAnimals API), pet stores (OSM/Overpass) and
 * the user's location. Only places with valid coordinates are ever passed in.
 * @param {{
 *   clinics: Array,
 *   stores: Array,
 *   userCoords: { lat: number, lng: number } | null,
 *   center: [number, number],
 *   zoom: number,
 * }}
 */
export default function NearbyMap({ clinics, stores, userCoords, center, zoom }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <MapErrorBoundary>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          className="h-72 w-full sm:h-96"
        >
          <SetViewOnChange center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userCoords && (
            <Marker position={[userCoords.lat, userCoords.lng]} icon={userPin}>
              <Popup>
                <p className="text-sm font-bold text-slate-900">You are here</p>
              </Popup>
            </Marker>
          )}
          {clinics.map((clinic) => (
            <Marker
              key={clinic.id}
              position={[Number(clinic.latitude), Number(clinic.longitude)]}
              icon={clinicPin}
            >
              <Popup>
                <ClinicPopup clinic={clinic} />
              </Popup>
            </Marker>
          ))}
          {stores.map((store) => (
            <Marker key={store.id} position={[store.lat, store.lng]} icon={storePin}>
              <Popup>
                <StorePopup store={store} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </MapErrorBoundary>
    </div>
  )
}
