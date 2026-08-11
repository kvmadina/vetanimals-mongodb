import { Link } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import { MapPinIcon } from './Icons.jsx'

/**
 * Veterinarian card for the discovery grid.
 * @param {{
 *   vet: object,
 *   isFavorite: boolean,
 *   onToggleFavorite: (vet: object) => void,
 * }}
 */
export default function VetCard({ vet, isFavorite, onToggleFavorite }) {
  const detailUrl = `/vets/${vet.id}`

  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-4 p-5">
        <Link to={detailUrl} aria-label={vet.name} className="shrink-0">
          <Avatar src={vet.avatar_url} name={vet.name} className="h-14 w-14 text-xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={detailUrl}
            className="line-clamp-1 text-base font-semibold text-slate-900 transition hover:text-emerald-700"
          >
            {vet.name}
          </Link>
          {vet.specialty && (
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
              {vet.specialty}
            </span>
          )}
        </div>
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(vet)}
          label="favorites"
          size="sm"
          className="mt-0.5"
        />
      </div>

      {vet.bio && (
        <p className="line-clamp-2 px-5 text-sm leading-relaxed text-slate-500">
          {vet.bio}
        </p>
      )}

      {vet.clinics?.name && (
        <p className="mt-3 flex items-center gap-1.5 px-5 text-xs font-medium text-slate-500">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="line-clamp-1">{vet.clinics.name}</span>
        </p>
      )}

      <div className="mt-auto border-t border-slate-100 p-4 pt-3.5">
        <Link
          to={detailUrl}
          className="btn-secondary h-9 w-full px-3 py-0"
        >
          View profile
        </Link>
      </div>
    </article>
  )
}
