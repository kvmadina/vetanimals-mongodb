import { useState } from 'react'
import { StarIcon } from './Icons.jsx'

const SORT_OPTIONS = ['Most recent', 'Highest rated', 'Lowest rated']

/**
 * Customer Reviews section.
 *
 * The current schema has NO reviews table, so this renders a polished
 * empty state instead of fake reviews. It is structured so a real reviews
 * table (product_id, user_id, rating, title, body, created_at, verified)
 * can be connected later without redesigning the UI.
 *
 * @param {{ productId: string }}
 */
export default function ReviewsSection({ productId: _productId }) {
  const [sort, setSort] = useState('Most recent')

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="text-xl font-bold tracking-tight text-slate-900">
            Customer Reviews
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Hear from other pet parents.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field w-auto py-1.5"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Empty state — shown until a real reviews table is available */}
      <div className="mt-8 flex flex-col items-center border-t border-slate-100 pt-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <StarIcon className="h-7 w-7" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-900">
          No reviews yet
        </h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
          Be the first to share your experience with this product.
        </p>
      </div>

      <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
        Reviews are stored server-side per product. A reviews table is required
        before verified customer reviews can be displayed.
      </p>
    </section>
  )
}
