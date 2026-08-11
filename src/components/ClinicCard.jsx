import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton.jsx'
import { BuildingIcon, GlobeIcon, MapPinIcon, PhoneIcon } from './Icons.jsx'

/**
 * Clinic card for the clinic listing grid. No rating is shown — the schema
 * has no rating field on clinics, and the project forbids fake data.
 * @param {{
 *   clinic: object,
 *   isFavorite: boolean,
 *   onToggleFavorite: (clinic: object) => void,
 * }}
 */
export default function ClinicCard({ clinic, isFavorite, onToggleFavorite }) {
  const detailUrl = `/clinics/${clinic.id}`

  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-4 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <BuildingIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={detailUrl}
            className="line-clamp-1 text-base font-semibold text-slate-900 transition hover:text-emerald-700"
          >
            {clinic.name}
          </Link>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
            <MapPinIcon className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-emerald-600" />
            {clinic.address}
          </p>
        </div>
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(clinic)}
          label="favorites"
          size="sm"
          className="mt-0.5"
        />
      </div>

      <dl className="mt-auto space-y-2 border-t border-slate-100 p-5 pt-4">
        {clinic.phone && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <a
              href={`tel:${clinic.phone.replace(/[^+\d]/g, '')}`}
              className="truncate transition hover:text-emerald-700"
            >
              {clinic.phone}
            </a>
          </div>
        )}
        {clinic.website && (
          <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <GlobeIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <a
              href={clinic.website}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate transition hover:text-emerald-700"
            >
              {clinic.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </dl>

      <div className="border-t border-slate-100 p-4 pt-3.5">
        <Link to={detailUrl} className="btn-secondary h-9 w-full px-3 py-0">
          View clinic
        </Link>
      </div>
    </article>
  )
}
