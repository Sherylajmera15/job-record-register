'use client';
import { SortOption } from '@/types';

interface Props {
  search: string;
  sortBy: SortOption;
  onSearchChange: (v: string) => void;
  onSortChange: (v: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',      label: 'Newest First' },
  { value: 'oldest',      label: 'Oldest First' },
  { value: 'customer_az', label: 'Customer A → Z' },
  { value: 'customer_za', label: 'Customer Z → A' },
  { value: 'job_az',      label: 'Job Name A → Z' },
  { value: 'job_za',      label: 'Job Name Z → A' },
  { value: 'order_qty',   label: 'Order Qty (High)' },
  { value: 'sheets',      label: 'Sheets (High)' },
  { value: 'kg',          label: 'KG (High)' },
];

export default function SearchSort({ search, sortBy, onSearchChange, onSortChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: '#3d5070' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by customer, job name, GSM, quality, date..."
          className="form-input pl-10 pr-9"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: '#3d5070' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e040fb'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3d5070'; }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="relative sm:w-52">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: '#3d5070' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as SortOption)}
          className="form-input pl-10 appearance-none"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
