import { Link } from 'react-router-dom'
import { formatDistance } from '../lib/geo.js'
import { BagIcon, CalendarIcon, MapPinIcon, NavigationIcon, PawIcon, PhoneIcon } from './Icons.jsx'

/**
 * "Near You" location card (clinic from the API, or pet store from OSM).
 * @param {{
 *   place: {
 *     id: string, name: string, type: 'clinic'|'store',
 *     address?: string, phone?: string, website?: string,
 *     distanceKm?: number|null, hasCoords?: boolean,
 *   },
 * }}
 */
export default function PlaceCard({ place }) {
  const isClinic = place.type === 'clinic'
  const distance = formatDistance(place.distanceKm)

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          isClinic ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}
        aria-hidden="true"
      >
        {isClinic ? <PawIcon className="h-5 w-5" /> : <BagIcon className="h-5 w-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold text-slate-900">{place.name}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              isClinic ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isClinic ? 'Veterinary clinic' : 'Pet store'}
          </span>
        </div>

        <div className="mt-1.5 space-y-1 text-xs text-slate-500">
          {place.address && (
            <p className="flex items-start gap-1.5">
              <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="line-clamp-1">{place.address}</span>
            </p>
          )}
          {place.phone && (
            <p className="flex items-center gap-1.5">
              <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <a href={`tel:${place.phone.replace(/[^+\d]/g, '')}`} className="transition hover:text-emerald-700">
                {place.phone}
              </a>
            </p>
          )}
          <p className="flex items-center gap-1.5 font-medium text-slate-600">
            <NavigationIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {distance || (isClinic && !place.hasCoords ? 'Location unavailable' : 'Nearby')}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isClinic ? (
          <>
            <Link to={`/clinics/${place.id}`} className="btn-secondary h-9 px-3 py-0">
              View details
            </Link>
            <Link
              to="/appointments/new"
              state={{ clinicId: place.id, clinicName: place.name }}
              className="btn-primary h-9 px-3 py-0"
            >
              <CalendarIcon className="h-4 w-4" />
              Book
            </Link>
          </>
        ) : (
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary h-9 px-3 py-0"
          >
            <NavigationIcon className="h-4 w-4" />
            View on map
          </a>
        )}
      </div>
    </article>
  )
}
