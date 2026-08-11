import { ChevronDownIcon } from './Icons.jsx'

const SPECIES_OPTIONS = [
  { value: '', label: 'All species' },
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'hamster', label: 'Hamster' },
]

const PRICE_RANGES = [
  { value: '', label: 'Any price' },
  { value: 'under-25', label: 'Under $25' },
  { value: '25-50', label: '$25 – $50' },
  { value: 'over-50', label: 'Over $50' },
]

const AVAILABILITY = [
  { value: '', label: 'Any availability' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'low-stock', label: 'Low stock' },
  { value: 'out-of-stock', label: 'Out of stock' },
]

function Group({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="mt-2.5 space-y-1">{children}</div>
    </div>
  )
}

function OptionButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
        active
          ? 'bg-emerald-50 font-medium text-emerald-800'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={`filter-${label}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <div className="relative">
        <select
          id={`filter-${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field appearance-none pr-9"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

/**
 * Filter controls used in the desktop sidebar and the mobile drawer.
 * @param {{
 *   categories: Array<{id: string, name: string}>,
 *   activeCategoryId: string,
 *   onCategoryChange: (id: string) => void,
 *   activeSpecies: string,
 *   onSpeciesChange: (value: string) => void,
 *   priceRange: string,
 *   onPriceChange: (value: string) => void,
 *   availability: string,
 *   onAvailabilityChange: (value: string) => void,
 * }}
 */
export default function ShopFilterPanel({
  categories,
  activeCategoryId,
  onCategoryChange,
  activeSpecies,
  onSpeciesChange,
  priceRange,
  onPriceChange,
  availability,
  onAvailabilityChange,
}) {
  return (
    <div className="space-y-6">
      <Group title="Category">
        <OptionButton
          active={!activeCategoryId}
          onClick={() => onCategoryChange('')}
        >
          All categories
        </OptionButton>
        {categories.map((category) => (
          <OptionButton
            key={category.id}
            active={activeCategoryId === category.id}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </OptionButton>
        ))}
      </Group>

      <Group title="Species">
        {SPECIES_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            active={activeSpecies === option.value}
            onClick={() => onSpeciesChange(option.value)}
          >
            {option.label}
          </OptionButton>
        ))}
      </Group>

      <SelectField
        label="Price"
        value={priceRange}
        onChange={onPriceChange}
        options={PRICE_RANGES}
      />

      <SelectField
        label="Availability"
        value={availability}
        onChange={onAvailabilityChange}
        options={AVAILABILITY}
      />
    </div>
  )
}
