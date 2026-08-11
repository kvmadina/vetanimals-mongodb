import { useState } from 'react'
import { getPetErrorMessage } from '../lib/pets.js'
import {
  AlertIcon,
  CakeIcon,
  ChevronDownIcon,
  EditIcon,
  ScaleIcon,
  TrashIcon,
} from './Icons.jsx'

const TYPE_STYLES = {
  dog: 'bg-amber-100 text-amber-800',
  cat: 'bg-emerald-100 text-emerald-800',
  bird: 'bg-sky-100 text-sky-800',
  fish: 'bg-cyan-100 text-cyan-800',
  rabbit: 'bg-rose-100 text-rose-800',
  hamster: 'bg-orange-100 text-orange-800',
  reptile: 'bg-lime-100 text-lime-800',
  other: 'bg-slate-200 text-slate-700',
}

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  unknown: 'Unknown',
}

function getTypeStyle(type) {
  return TYPE_STYLES[String(type || '').toLowerCase()] || TYPE_STYLES.other
}

function formatPetAge(pet) {
  if (!pet.birth_date) return null
  const parsed = new Date(pet.birth_date)
  if (Number.isNaN(parsed.getTime())) return null
  // Parse as local time to avoid UTC off-by-one-day shifts
  const birth = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  const now = new Date()
  if (birth > now) return null

  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years > 0) return years === 1 ? '1 year' : `${years} years`
  if (months > 0) return months === 1 ? '1 month' : `${months} months`
  const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24))
  return days <= 1 ? 'Just born' : `${days} days`
}

function formatWeight(pet) {
  if (pet.weight == null) return null
  return `${Number(pet.weight).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} kg`
}

function formatDate(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const iconButtonClass =
  'inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30'

/**
 * Displays one pet with expandable details, edit, and inline delete confirm.
 *
 * @param {{ pet: object, onEdit: (pet: object) => void, onDelete: (pet: object) => Promise<void> }}
 */
export default function PetCard({ pet, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [imgFailed, setImgFailed] = useState(false)

  const typeStyle = getTypeStyle(pet.type)
  const initial = (pet.name?.[0] || 'P').toUpperCase()
  // Show the photo only when a URL exists and it loads successfully
  const showPhoto = Boolean(pet.avatar_url) && !imgFailed
  const ageLabel = formatPetAge(pet)
  const weightLabel = formatWeight(pet)
  const genderLabel = GENDER_LABELS[pet.gender] || '—'
  const birthDateLabel = formatDate(pet.birth_date)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await onDelete(pet)
    } catch (err) {
      console.error('[PetCard] Delete error:', err)
      setDeleteError(getPetErrorMessage(err, 'Could not delete this pet. Please try again.'))
      setConfirming(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-sm">
      {/* Header row */}
      <div className="flex items-start gap-4 p-5">
        <div className="shrink-0">
          {showPhoto ? (
            <img
              src={pet.avatar_url}
              alt={`${pet.name} photo`}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${typeStyle}`}
            >
              {initial}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {pet.name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {pet.type}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {ageLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <CakeIcon className="h-3.5 w-3.5" />
                {ageLabel}
              </span>
            )}
            {weightLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <ScaleIcon className="h-3.5 w-3.5" />
                {weightLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide details' : 'Show details'}
            className={`${iconButtonClass} ${expanded ? 'bg-slate-100 text-slate-700' : ''}`}
          >
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onEdit(pet)}
            aria-label={`Edit ${pet.name}`}
            className={iconButtonClass}
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteError('')
              setConfirming(true)
            }}
            aria-label={`Delete ${pet.name}`}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Type</dt>
            <dd className="mt-1 font-medium text-slate-900">{pet.type || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Breed</dt>
            <dd className="mt-1 font-medium text-slate-900">{pet.breed || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Gender</dt>
            <dd className="mt-1 font-medium capitalize text-slate-900">{genderLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Date of birth</dt>
            <dd className="mt-1 font-medium text-slate-900">{birthDateLabel || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Age</dt>
            <dd className="mt-1 font-medium text-slate-900">{ageLabel || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Weight</dt>
            <dd className="mt-1 font-medium text-slate-900">{weightLabel || '—'}</dd>
          </div>
        </dl>
      )}

      {/* Inline delete confirmation */}
      {confirming && (
        <div className="border-t border-red-100 bg-red-50/60 px-5 py-4">
          <p className="text-sm font-medium text-slate-800">
            Delete {pet.name}? This can&apos;t be undone.
          </p>
          {deleteError && (
            <div role="alert" className="form-banner--error mt-3">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  Deleting…
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
