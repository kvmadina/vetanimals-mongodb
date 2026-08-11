const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-sky-100 text-sky-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-800',
}

export default function OrderStatusBadge({ status }) {
  const value = String(status || 'pending').toLowerCase()
  const label = value.charAt(0).toUpperCase() + value.slice(1)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        STATUS_STYLES[value] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {label}
    </span>
  )
}
