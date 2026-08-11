const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Derive product badges strictly from real, available data:
 *   - "New"          from created_at (within the last 30 days)
 *   - "In stock" / "Low stock" / "Out of stock" from stock
 * "Best Seller" / "Popular" are intentionally NOT shown — the schema has no
 * sales or popularity data, and the project forbids fake statistics.
 * @param {object} product
 * @returns {Array<{ key: string, label: string, tone: string }>}
 */
function getProductBadges(product) {
  const stock = Number(product.stock) || 0
  const badges = []

  if (stock <= 0) {
    badges.push({ key: 'out-of-stock', label: 'Out of stock', tone: 'dark' })
  } else if (stock <= 5) {
    badges.push({ key: 'low-stock', label: 'Low stock', tone: 'amber' })
  } else {
    badges.push({ key: 'in-stock', label: 'In stock', tone: 'green' })
  }

  const created = product.created_at ? new Date(product.created_at) : null
  if (created && !Number.isNaN(created.getTime()) && Date.now() - created.getTime() < NEW_WINDOW_MS) {
    badges.push({ key: 'new', label: 'New', tone: 'outline-green' })
  }

  return badges
}

const TONE_CLASSES = {
  dark: 'bg-slate-900/85 text-white',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
  'outline-green': 'border border-emerald-600 bg-white text-emerald-700',
}

/**
 * Renders derived badges (meant to overlay the top-left of a product image).
 * @param {{ product: object, className?: string }}
 */
export default function ProductBadge({ product, className = '' }) {
  const badges = getProductBadges(product)
  if (badges.length === 0) return null
  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[badge.tone]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}
