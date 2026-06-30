'use client';
import { format } from 'date-fns';
import { Job, PartialEntry } from '@/types';

export interface DuplicateMatch {
  type: 'active' | 'paper_planned' | 'partial';
  job?: Job;
  partial?: PartialEntry;
}

interface Props {
  matches: DuplicateMatch[];
  onRepeatOrder: (job: Job) => void;
  onCreateAnyway: () => void;
  onCancel: () => void;
}

function fmtDate(dt: string) {
  try { return format(new Date(dt), 'dd MMM yyyy'); } catch { return dt; }
}

function fmtBox(j: Job): string {
  const parts: string[] = [];
  if (j.length != null) parts.push(String(j.length));
  if (j.width  != null) parts.push(String(j.width));
  if (j.height != null) parts.push(String(j.height));
  return parts.length ? parts.join(' × ') + ' cm' : '—';
}

const PRINTING_LABEL: Record<string, string> = {
  outer: 'Outer',
  inner: 'Inner',
  both:  'Both (Outer + Inner)',
};

function StatusBadge({ match }: { match: DuplicateMatch }) {
  if (match.type === 'partial') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}
      >
        Partial Entry
      </span>
    );
  }

  const job = match.job!;
  return (
    <div className="flex flex-wrap gap-1.5">
      {match.type === 'paper_planned' ? (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)' }}
        >
          ✓ Paper Planned
        </span>
      ) : (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(0,204,240,0.15)', color: '#00ccf0', border: '1px solid rgba(0,204,240,0.35)' }}
        >
          Active Job
        </span>
      )}
      {job.repeat_order_count > 0 && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(224,64,251,0.15)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.35)' }}
        >
          Repeat Orders: {job.repeat_order_count}
        </span>
      )}
    </div>
  );
}

function JobMatchCard({ match }: { match: DuplicateMatch }) {
  if (match.type === 'partial') {
    const p = match.partial!;
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: '#141c35', border: '1px solid rgba(251,191,36,0.25)' }}>
        <StatusBadge match={match} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {([
            ['Customer',      p.customer_name ?? '—'],
            ['Job Name',      p.job_name ?? '—'],
            ['Artworks',      p.artworks || '—'],
            ['Paper Quality', p.paper_quality ?? '—'],
            ['GSM',           p.gsm != null ? String(p.gsm) : '—'],
            ['Created',       fmtDate(p.created_at)],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: '#3d5070' }}>{label}</div>
              <div className="font-medium mt-0.5 text-sm" style={{ color: '#e2e8f0' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const j = match.job!;
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: '#141c35',
        border: match.type === 'paper_planned'
          ? '1px solid rgba(52,211,153,0.3)'
          : '1px solid rgba(0,204,240,0.25)',
      }}
    >
      <StatusBadge match={match} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {([
          ['Customer',      j.customer_name],
          ['Job Name',      j.job_name],
          ['Artworks',      j.artworks || '—'],
          ['Paper Quality', j.paper_quality],
          ['GSM',           String(j.gsm)],
          ['Sheet Size',    `${j.sheet_length} × ${j.sheet_width} cm`],
          ['UPS',           String(j.ups)],
          ['Printing',      PRINTING_LABEL[j.printing_type] || j.printing_type],
          ['Box Size',      fmtBox(j)],
          ['Created',       fmtDate(j.created_at)],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: '#3d5070' }}>{label}</div>
            <div className="font-medium mt-0.5 text-sm" style={{ color: '#e2e8f0' }}>{val}</div>
          </div>
        ))}
      </div>
      {j.remarks && (
        <div style={{ borderTop: '1px solid #1e2d50', paddingTop: 10 }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#3d5070' }}>Remarks</div>
          <div className="text-sm" style={{ color: '#94a3b8' }}>{j.remarks}</div>
        </div>
      )}
    </div>
  );
}

export default function DuplicateJobModal({ matches, onRepeatOrder, onCreateAnyway, onCancel }: Props) {
  // Find the first full-job match to use for Repeat Order
  const jobMatch = matches.find(m => m.type === 'active' || m.type === 'paper_planned');
  const hasJobMatch = !!jobMatch;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: '#0d1228', border: '1px solid rgba(251,191,36,0.4)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a1200, #1a0d00)', borderBottom: '1px solid rgba(251,191,36,0.25)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)' }}
            >
              ⚠
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#fbbf24' }}>
                Possible Duplicate Job Found
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#92784a' }}>
                A job with the same <strong style={{ color: '#fbbf24' }}>Job Name</strong> and{' '}
                <strong style={{ color: '#fbbf24' }}>Artwork Number</strong> already exists.
                Please review before deciding how to proceed.
              </p>
            </div>
          </div>
        </div>

        {/* Matches */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {matches.map((m, idx) => (
            <JobMatchCard key={idx} match={m} />
          ))}
        </div>

        {/* Buttons */}
        <div
          className="px-6 py-4 shrink-0 space-y-2"
          style={{ borderTop: '1px solid #1e2d50', background: '#0d1228' }}
        >
          {/* Repeat Order — only shown when a full job exists */}
          {hasJobMatch && (
            <button
              onClick={() => onRepeatOrder(jobMatch!.job!)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ background: 'rgba(0,204,240,0.15)', color: '#00ccf0', border: '1px solid rgba(0,204,240,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,204,240,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,204,240,0.15)'; }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Repeat Order
              <span className="text-xs font-medium opacity-75">(Recommended)</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCreateAnyway}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
            >
              Create New Job Anyway
            </button>
            <button
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
