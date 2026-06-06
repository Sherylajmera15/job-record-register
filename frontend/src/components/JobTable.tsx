'use client';
import { Job, SortOption } from '@/types';
import { format } from 'date-fns';

interface Props {
  jobs: Job[];
  loading: boolean;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

const COL_SORT: { label: string; key?: SortOption }[] = [
  { label: 'Date', key: 'newest' },
  { label: 'Customer', key: 'customer_az' },
  { label: 'Job Name', key: 'job_az' },
  { label: 'Artworks' },
  { label: 'Box Size' },
  { label: 'GSM' },
  { label: 'Quality' },
  { label: 'Order Qty', key: 'order_qty' },
  { label: 'Sheet Size' },
  { label: 'UPS' },
  { label: 'Final Sheets', key: 'sheets' },
  { label: 'Total KG', key: 'kg' },
  { label: 'Actions' },
];

function formatDate(dt: string) {
  try { return format(new Date(dt), 'dd/MM/yyyy'); } catch { return dt; }
}

function formatBox(job: Job): string {
  const parts: string[] = [];
  if (job.length != null) parts.push(String(job.length));
  if (job.width != null) parts.push(String(job.width));
  if (job.height != null) parts.push(String(job.height));
  return parts.length > 0 ? parts.join('×') : '—';
}

export default function JobTable({ jobs, loading, sortBy, onSortChange, onEdit, onDelete }: Props) {
  const toggleSort = (key?: SortOption) => {
    if (!key) return;
    if (key === 'newest') {
      onSortChange(sortBy === 'newest' ? 'oldest' : 'newest');
    } else if (key === 'customer_az') {
      onSortChange(sortBy === 'customer_az' ? 'customer_za' : 'customer_az');
    } else if (key === 'job_az') {
      onSortChange(sortBy === 'job_az' ? 'job_za' : 'job_az');
    } else {
      onSortChange(key);
    }
  };

  const sortIndicator = (key?: SortOption): string => {
    if (!key) return '';
    const up = ['customer_az', 'job_az', 'oldest', 'order_qty', 'sheets', 'kg'];
    const down = ['customer_za', 'job_za', 'newest'];
    if (sortBy === key || (key === 'newest' && sortBy === 'oldest')) {
      if (down.includes(sortBy) || sortBy === 'newest') return ' ↓';
      if (up.includes(sortBy)) return ' ↑';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="card p-16 flex flex-col items-center gap-4">
        <svg className="w-10 h-10 animate-spin" style={{ color: '#00ccf0' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="font-medium" style={{ color: '#3d5070' }}>Loading job records...</p>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="card p-16 flex flex-col items-center gap-4">
        <svg className="w-16 h-16" style={{ color: '#1e2d50' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="text-center">
          <p className="font-semibold text-lg text-white">No job records found</p>
          <p className="text-sm mt-1" style={{ color: '#3d5070' }}>Create your first job record using the button above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="sticky-table w-full border-collapse text-sm">
        <thead>
          <tr>
            {COL_SORT.map(({ label, key }) => (
              <th
                key={label}
                onClick={() => toggleSort(key)}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                  key ? 'cursor-pointer select-none' : ''
                }`}
                style={key ? { transition: 'color 0.15s' } : {}}
                onMouseEnter={e => { if (key) (e.target as HTMLElement).style.color = '#e040fb'; }}
                onMouseLeave={e => { if (key) (e.target as HTMLElement).style.color = '#00ccf0'; }}
              >
                {label}{sortIndicator(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => (
            <tr
              key={job.id}
              style={{
                background: i % 2 === 0 ? '#0d1228' : '#0a0f20',
                borderBottom: '1px solid #1e2d50',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#141c35'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#0d1228' : '#0a0f20'; }}
            >
              {/* Date */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{formatDate(job.created_at)}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#3d5070' }}>
                  {job.created_at !== job.updated_at ? `Edited ${formatDate(job.updated_at)}` : 'Not edited'}
                </div>
              </td>
              {/* Customer */}
              <td className="px-4 py-3">
                <div className="font-semibold max-w-[160px] truncate text-white" title={job.customer_name}>
                  {job.customer_name}
                </div>
              </td>
              {/* Job Name */}
              <td className="px-4 py-3">
                <div className="max-w-[160px] truncate" style={{ color: '#94a3b8' }} title={job.job_name}>
                  {job.job_name}
                </div>
              </td>
              {/* Artworks */}
              <td className="px-4 py-3">
                <div
                  className="max-w-[140px] truncate text-xs"
                  style={{ color: '#00ccf0' }}
                  title={job.artworks || '—'}
                >
                  {job.artworks || <span style={{ color: '#3d5070' }}>—</span>}
                </div>
              </td>
              {/* Box Size */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ background: '#141c35', color: '#94a3b8', border: '1px solid #1e2d50' }}
                >
                  {formatBox(job)}
                </span>
              </td>
              {/* GSM */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background: 'rgba(224,64,251,0.12)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.25)' }}
                >
                  {job.gsm}
                </span>
              </td>
              {/* Quality */}
              <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: '#94a3b8' }}>{job.paper_quality}</td>
              {/* Order Qty */}
              <td className="px-4 py-3 whitespace-nowrap font-semibold text-white">
                {job.order_quantity.toLocaleString('en-IN')}
              </td>
              {/* Sheet Size */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ background: '#141c35', color: '#94a3b8', border: '1px solid #1e2d50' }}
                >
                  {job.sheet_length}×{job.sheet_width}
                </span>
              </td>
              {/* UPS */}
              <td className="px-4 py-3 whitespace-nowrap text-center" style={{ color: '#94a3b8' }}>{job.ups}</td>
              {/* Final Sheets */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-bold" style={{ color: '#00ccf0' }}>{job.final_sheets.toLocaleString('en-IN')}</span>
                <span className="text-[10px] ml-1" style={{ color: '#3d5070' }}>({job.wastage_percentage}%)</span>
              </td>
              {/* Total KG */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-bold" style={{ color: '#34d399' }}>{job.total_kg.toLocaleString('en-IN')}</span>
                <span className="text-xs ml-0.5" style={{ color: '#3d5070' }}>kg</span>
              </td>
              {/* Actions */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEdit(job)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.1)'; }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(job)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
