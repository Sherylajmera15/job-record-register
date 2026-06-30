'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Job, RepeatOrder } from '@/types';
import { repeatOrderApi } from '@/lib/api';

interface Props {
  job: Job;
  onClose: () => void;
}

function fmtBox(job: Job): string {
  const parts: string[] = [];
  if (job.length != null) parts.push(String(job.length));
  if (job.width  != null) parts.push(String(job.width));
  if (job.height != null) parts.push(String(job.height));
  return parts.length ? parts.join(' × ') + ' cm' : '—';
}

function fmtDate(dt: string) {
  try { return format(new Date(dt), 'dd MMM yyyy'); } catch { return dt; }
}

const PRINTING_LABEL: Record<string, string> = {
  outer: 'Outer',
  inner: 'Inner',
  both:  'Both (Outer + Inner)',
};

export default function JobDetailsDrawer({ job, onClose }: Props) {
  const [repeats, setRepeats]   = useState<RepeatOrder[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    repeatOrderApi.list(job.id)
      .then(res => setRepeats(res.data))
      .catch(() => setRepeats([]))
      .finally(() => setLoading(false));
  }, [job.id]);

  const totalQty = job.order_quantity + repeats.reduce((s, r) => s + r.order_quantity, 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-end backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative h-full w-full max-w-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: '#0d1228', borderLeft: '1px solid #1e2d50' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, #0d1228, #141c35)', borderBottom: '1px solid #1e2d50' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white truncate">{job.job_name}</h2>
              {job.paper_planned && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.4)' }}
                >
                  ✓ Paper Planned
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5 truncate" style={{ color: '#94a3b8' }}>{job.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(224,64,251,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Job Details Grid */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#3d5070' }}>
              Job Details
            </p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#141c35', border: '1px solid #1e2d50' }}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {([
                  ['Artworks',      job.artworks || '—'],
                  ['Box Size',      fmtBox(job)],
                  ['GSM',           String(job.gsm)],
                  ['Paper Quality', job.paper_quality],
                  ['Sheet Size',    `${job.sheet_length} × ${job.sheet_width} cm`],
                  ['UPS',           String(job.ups)],
                  ['Printing',      PRINTING_LABEL[job.printing_type] || job.printing_type],
                  ['Wastage',       `${job.wastage_percentage}%`],
                  ['Base Sheets',   job.base_sheets.toLocaleString('en-IN')],
                  ['Final Sheets',  job.final_sheets.toLocaleString('en-IN')],
                  ['Total KG',      `${job.total_kg.toLocaleString('en-IN')} kg`],
                  ['Created',       fmtDate(job.created_at)],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <div className="text-xs" style={{ color: '#3d5070' }}>{label}</div>
                    <div className="font-medium mt-0.5" style={{ color: '#e2e8f0' }}>{val}</div>
                  </div>
                ))}
              </div>
              {job.remarks && (
                <div style={{ borderTop: '1px solid #1e2d50', paddingTop: 12 }}>
                  <div className="text-xs mb-1" style={{ color: '#3d5070' }}>Remarks</div>
                  <div className="text-sm" style={{ color: '#94a3b8' }}>{job.remarks}</div>
                </div>
              )}
            </div>
          </section>

          {/* Order History */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#3d5070' }}>
              Order History
            </p>

            {loading ? (
              <div className="rounded-xl p-6 flex items-center justify-center gap-2" style={{ background: '#141c35', border: '1px solid #1e2d50' }}>
                <svg className="w-4 h-4 animate-spin" style={{ color: '#00ccf0' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm" style={{ color: '#3d5070' }}>Loading orders...</span>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2d50' }}>

                {/* Original Order */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: '#141c35', borderBottom: repeats.length > 0 ? '1px solid #1e2d50' : undefined }}
                >
                  <div>
                    <div className="text-xs font-medium" style={{ color: '#3d5070' }}>
                      {fmtDate(job.created_at)} · Original Order
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">
                      {job.order_quantity.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px]" style={{ color: '#3d5070' }}>units</div>
                  </div>
                </div>

                {/* Repeat Orders */}
                {repeats.map((rep, idx) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      background: idx % 2 === 0 ? '#0d1228' : '#0a0f20',
                      borderBottom: idx < repeats.length - 1 ? '1px solid #1e2d50' : undefined,
                    }}
                  >
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#3d5070' }}>
                        {fmtDate(rep.created_at)} · Repeat Order #{idx + 1}
                      </div>
                      {rep.remarks && (
                        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{rep.remarks}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm" style={{ color: '#00ccf0' }}>
                        {rep.order_quantity.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px]" style={{ color: '#3d5070' }}>units</div>
                    </div>
                  </div>
                ))}

                {/* Total — only shown when there are repeat orders */}
                {repeats.length > 0 && (
                  <div
                    className="flex items-center justify-between px-4 py-4"
                    style={{ background: 'rgba(52,211,153,0.08)', borderTop: '2px solid rgba(52,211,153,0.4)' }}
                  >
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider" style={{ color: '#34d399' }}>
                        Total Order Quantity
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#166534' }}>
                        {1 + repeats.length} order{repeats.length !== 0 ? 's' : ''} combined
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-2xl font-extrabold"
                        style={{ color: '#34d399', letterSpacing: '-0.5px' }}
                      >
                        {totalQty.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs font-medium" style={{ color: '#166534' }}>units total</div>
                    </div>
                  </div>
                )}

                {/* No repeats yet */}
                {repeats.length === 0 && (
                  <div className="px-4 py-3 text-xs text-center" style={{ color: '#3d5070', background: '#0d1228' }}>
                    No repeat orders yet.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div
          className="px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid #1e2d50', background: '#0d1228' }}
        >
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
