import { useEffect, useState } from 'react'
import { useModalFocus } from '../hooks/useModalFocus.js'
import { getPetErrorMessage } from '../lib/pets.js'
import { AlertIcon, XIcon } from './Icons.jsx'

const PET_TYPE_SUGGESTIONS = [
  'Dog',
  'Cat',
  'Bird',
  'Fish',
  'Rabbit',
  'Hamster',
  'Guinea pig',
  'Reptile',
  'Other',
]

const URL_PATTERN = /^https?:\/\/\S+$/i

const EMPTY_VALUES = {
  name: '',
  type: '',
  breed: '',
  birth_date: '',
  gender: '',
  weight: '',
  avatar_url: '',
}

function Field({ label, htmlFor, error, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="form-label">
        {label}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/**
 * Add / edit pet dialog. Mounted only while open (parent renders it
 * conditionally), so initial state is derived from `pet` on mount.
 *
 * @param {{ pet?: object|null, onClose: () => void, onSubmit: (payload: object) => Promise<void> }}
 */
export default function PetFormModal({ pet, onClose, onSubmit }) {
  const isEdit = Boolean(pet)
  const dialogRef = useModalFocus(true)

  const [values, setValues] = useState(() => {
    if (!pet) return EMPTY_VALUES
    return {
      name: pet.name || '',
      type: pet.type || '',
      breed: pet.breed || '',
      birth_date: pet.birth_date || '',
      gender: pet.gender || '',
      weight: pet.weight != null ? String(pet.weight) : '',
      avatar_url: pet.avatar_url || '',
    }
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Close on Escape + lock body scroll while the dialog is open
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const setValue = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const validate = () => {
    const errors = {}
    if (!values.name.trim()) {
      errors.name = "Your pet's name is required."
    }
    if (!values.type.trim()) {
      errors.type = 'Type is required, e.g. Dog, Cat or Bird.'
    }
    if (values.avatar_url.trim() && !URL_PATTERN.test(values.avatar_url.trim())) {
      errors.avatar_url = 'Photo URL must start with http:// or https://'
    }
    if (values.weight.trim()) {
      const weight = Number(values.weight)
      if (Number.isNaN(weight) || weight < 0) {
        errors.weight = 'Weight must be 0 or more.'
      }
    }
    if (values.birth_date && new Date(values.birth_date) > new Date()) {
      errors.birth_date = 'Birth date cannot be in the future.'
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = {
      name: values.name.trim(),
      type: values.type.trim(),
      breed: values.breed.trim() || null,
      birth_date: values.birth_date || null,
      gender: values.gender || null,
      weight: values.weight.trim() ? Number(values.weight) : null,
      avatar_url: values.avatar_url.trim() || null,
    }

    setSubmitting(true)
    try {
      await onSubmit(payload)
      onClose()
    } catch (err) {
      console.error('[PetFormModal] Save error:', err)
      setFormError(
        getPetErrorMessage(err, 'Could not save this pet. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (key) =>
    `input-field ${fieldErrors[key] ? 'input-field--error' : ''}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-form-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="pet-form-title" className="text-lg font-bold tracking-tight text-slate-900">
            {isEdit ? `Edit ${pet.name}` : 'Add a new pet'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-6 py-6">
          {formError && (
            <div role="alert" className="form-banner--error mb-5">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Pet name"
              htmlFor="pet-name"
              error={fieldErrors.name}
              className="sm:col-span-2"
            >
              <input
                id="pet-name"
                name="name"
                type="text"
                autoComplete="off"
                required
                value={values.name}
                onChange={setValue('name')}
                placeholder="e.g. Luna"
                className={inputClass('name')}
                autoFocus
              />
            </Field>

            <Field label="Type" htmlFor="pet-type" error={fieldErrors.type}>
              <input
                id="pet-type"
                name="type"
                type="text"
                list="pet-type-suggestions"
                required
                value={values.type}
                onChange={setValue('type')}
                placeholder="e.g. Dog, Cat, Bird"
                className={inputClass('type')}
              />
              <datalist id="pet-type-suggestions">
                {PET_TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </Field>

            <Field label="Breed" htmlFor="pet-breed" error={fieldErrors.breed}>
              <input
                id="pet-breed"
                name="breed"
                type="text"
                autoComplete="off"
                value={values.breed}
                onChange={setValue('breed')}
                placeholder="e.g. Golden Retriever"
                className={inputClass('breed')}
              />
            </Field>

            <Field label="Gender" htmlFor="pet-gender" error={fieldErrors.gender}>
              <select
                id="pet-gender"
                name="gender"
                value={values.gender}
                onChange={setValue('gender')}
                className={inputClass('gender')}
              >
                <option value="">Select gender…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>

            <Field
              label="Date of birth"
              htmlFor="pet-birth-date"
              error={fieldErrors.birth_date}
            >
              <input
                id="pet-birth-date"
                name="birth_date"
                type="date"
                value={values.birth_date}
                onChange={setValue('birth_date')}
                className={inputClass('birth_date')}
              />
            </Field>

            <Field label="Weight" htmlFor="pet-weight" error={fieldErrors.weight}>
              <div className="relative">
                <input
                  id="pet-weight"
                  name="weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={values.weight}
                  onChange={setValue('weight')}
                  placeholder="0.0"
                  className={`${inputClass('weight')} pr-12`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  kg
                </span>
              </div>
            </Field>

            <Field
              label="Photo URL"
              htmlFor="pet-avatar-url"
              error={fieldErrors.avatar_url}
              className="sm:col-span-2"
            >
              <input
                id="pet-avatar-url"
                name="avatar_url"
                type="url"
                autoComplete="off"
                value={values.avatar_url}
                onChange={setValue('avatar_url')}
                placeholder="https://example.com/luna.jpg (optional)"
                className={inputClass('avatar_url')}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Optional — pets without a photo get a generated avatar.
              </p>
            </Field>
          </div>

          <div className="mt-7 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  Saving…
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add pet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
