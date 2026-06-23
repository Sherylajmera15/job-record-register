'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { PartialEntry, PartialEntryCreate } from '@/types';
import { partialApi } from '@/lib/api';
import PartialEntryEditForm from './PartialEntryEditForm';

interface Props {
  onComplete: (partial: PartialEntry) => void;
  refreshKey: number;
}

function countMissing(p: PartialEntry): number {
  const fields: (keyof PartialEntry)[] = [
    'customer_name', 'job_name', 'gsm', 'paper_quality',
    'order_quantity', 'sheet_length', 'sheet_width',
  ];
  const missingFields = fields.filter(k => !p[k]).length;
  // UPS is present if any UPS value was entered (total_ups / outer_ups / ups)
  const hasUps = !!(p.total_ups ?? p.outer_ups ?? p.inner_ups ?? p.ups);
  return missingFields + (hasUps ? 0 : 1);
}

function fmt(dt: string) {
  try { return format(new Date(dt), 'dd/MM/yyyy'); } catch { return dt; }
}

export default function PartialEntriesSection({ onComplete, refreshKey }: Props) {
  const [partials, setPartials] = useState<PartialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<PartialEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartialEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchPartials = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await partialApi.list(q || undefined);
      setPartials(res.data);
    } catch {
      setPartials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when parent signals a refresh (e.g., after completing a partial)
  useEffect(() => {
    fetchPartials(search || undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchPartials(search || undefined), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search, fetchPartials]);

  const handleSaveEdit = async (data: PartialEntryCreate) => {
    if (!editTarget) return;
    await partialApi.update(editTarget.id, data);
    setEditTarget(null);
    fetchPartials(search || undefined);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await partialApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchPartials(search || undefined);
    } finally {
      setDeleting(false);
    }
  };

  // Hide section when empty and no active search
  if (!loading && partials.length === 0 && !search) return null;

  return (
    <>
      <div className="mt-6">
        {/* Section header */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold" style={{ color: '#fbbf24' }}>
                  Draft Entries
                </h2>
                {!loading && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                  >
                    {partials.length}
                  </span>
                )}
                <span className="text-xs" style={{ color: '#3d5070' }}>
                  Incomplete records — excluded from Dashboard &amp; Exports
                </span>
              </div>
            </div>
            {/* Search */}
            <div className="relative max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: '#3d5070' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="form-input pl-9 text-sm"
                placeholder="Search drafts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-10 flex items-center justify-center gap-3">
            <svg className="w-6 h-6 animate-spin" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span style={{ color: '#3d5070' }}>Loading drafts...</span>
          </div>
        ) : partials.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-semibold text-white">No draft entries match your search.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="sticky-table w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Date', 'Customer', 'Job Name', 'GSM', 'Quality', 'Missing', 'Actions'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partials.map((p, i) => {
                  const missing = countMissing(p);
                  return (
                    <tr
                      key={p.id}
                      style={{
                        background: i % 2 === 0 ? '#0d1228' : '#0a0f20',
                        borderBottom: '1px solid #1e2d50',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#141c35'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#0d1228' : '#0a0f20'; }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: '#94a3b8' }}>
                        {fmt(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[160px] truncate font-semibold" style={{ color: p.customer_name ? '#e2e8f0' : '#3d5070' }}>
                          {p.customer_name ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[160px] truncate" style={{ color: p.job_name ? '#94a3b8' : '#3d5070' }}>
                          {p.job_name ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.gsm ? (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ background: 'rgba(224,64,251,0.12)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.25)' }}
                          >
                            {p.gsm}
                          </span>
                        ) : <span style={{ color: '#3d5070' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: '#94a3b8' }}>
                        {p.paper_quality ?? <span style={{ color: '#3d5070' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={
                            missing === 0
                              ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                              : { background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }
                          }
                        >
                          {missing === 0 ? 'Ready' : `${missing} missing`}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {/* Edit */}
                          <button
                            onClick={() => setEditTarget(p)}
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
                          {/* Complete */}
                          <button
                            onClick={() => onComplete(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.2)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.1)'; }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Complete
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(p)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Form Drawer */}
      {editTarget && (
        <PartialEntryEditForm
          editPartial={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#0d1228', border: '1px solid #1e2d50' }}>
            <div className="px-6 py-5" style={{ background: '#141c35', borderBottom: '1px solid #1e2d50' }}>
              <h2 className="text-base font-bold text-white">Delete draft entry?</h2>
              <p className="text-sm mt-0.5" style={{ color: '#3d5070' }}>This cannot be undone.</p>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-lg p-3 mb-5" style={{ background: '#141c35', border: '1px solid #1e2d50' }}>
                <p className="font-semibold text-white">{deleteTarget.job_name ?? '(no job name)'}</p>
                <p className="text-sm" style={{ color: '#3d5070' }}>{deleteTarget.customer_name ?? '(no customer)'}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1" disabled={deleting}>
                  Cancel
                </button>
                <button onClick={handleDelete} className="btn-danger flex-1" disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
