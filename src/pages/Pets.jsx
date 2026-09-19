import { useCallback, useEffect, useState } from 'react'
import { fetchPets, createPet, updatePet, deletePet, getPetErrorMessage } from '../lib/pets.js'
import AppHeader from '../components/AppHeader.jsx'
import PetCard from '../components/PetCard.jsx'
import PetFormModal from '../components/PetFormModal.jsx'
import { AlertIcon, PawIcon, PlusIcon } from '../components/Icons.jsx'

function PetCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="mt-2 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-slate-100" />
            <div className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pets() {
  // The API scopes every /pets call to the signed-in owner, so this page never
  // needs the user id itself.
  const [pets, setPets] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready'
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPet, setEditingPet] = useState(null)

  const loadPets = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchPets()
      setPets(data)
      setStatus('ready')
    } catch (err) {
      console.error('[Pets] Failed to load pets:', err)
      setError(getPetErrorMessage(err, "We couldn't load your pets. Please try again."))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    loadPets()
  }, [loadPets])

  const openAddModal = () => {
    setEditingPet(null)
    setModalOpen(true)
  }

  const openEditModal = (pet) => {
    setEditingPet(pet)
    setModalOpen(true)
  }

  const handleModalSubmit = async (payload) => {
    if (editingPet) {
      const updated = await updatePet(editingPet.id, payload)
      setPets((prev) => prev.map((pet) => (pet.id === updated.id ? updated : pet)))
    } else {
      const created = await createPet(payload)
      setPets((prev) => [created, ...prev])
    }
  }

  const handleDelete = async (pet) => {
    await deletePet(pet.id)
    setPets((prev) => prev.filter((item) => item.id !== pet.id))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Pets
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              My pets
              {status === 'ready' && pets.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                  {pets.length}
                </span>
              )}
            </h1>
            <p className="mt-2 text-slate-500">
              Keep your pets&apos; details, records and reminders in one place.
            </p>
          </div>
          <button type="button" onClick={openAddModal} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add pet
          </button>
        </div>

        {/* Error state */}
        {status === 'error' && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="text-sm font-semibold text-red-800">
                  We couldn&apos;t load your pets
                </h2>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={loadPets}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {status === 'loading' && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <PetCardSkeleton key={key} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {status === 'ready' && pets.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <PawIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              No pets yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Add your first pet to start keeping health records, weight and
              important details in one place.
            </p>
            <button type="button" onClick={openAddModal} className="btn-primary mt-7">
              <PlusIcon className="h-4 w-4" />
              Add your first pet
            </button>
          </div>
        )}

        {/* Pets grid */}
        {status === 'ready' && pets.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add / edit dialog */}
      {modalOpen && (
        <PetFormModal
          pet={editingPet}
          onClose={() => setModalOpen(false)}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  )
}
