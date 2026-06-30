'use client';
import { useState } from 'react';
import { Job, RepeatOrderCreate } from '@/types';

interface Props {
  job: Job;
  onSave: (jobId: number, data: RepeatOrderCreate, isPaperPlanned: boolean) => Promise<void>;
  onClose: () => void;
}

function fmtBox(job: Job): string {
  const parts: string[] = [];
  if (job.length != null) parts.push(String(job.length));
  if (job.width  != null) parts.push(String(job.width));
  if (job.height != null) parts.push(String(job.height));
  return parts.length ? parts.join(' × ') : '—';
}

const PRINTING_LABEL: Record<string, string> = {
  outer: 'Outer',
  inner: 'Inner',
  both:  'Both (Outer + Inner)',
};

export default function RepeatOrderModal({ job, onSave, onClose }: Props) {
  const [orderQty, setOrderQty]   = useState('');
  const [remarks,  setRemarks]    = useState('');
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState('');

  const isPaperPlanned = job.paper_planned;

  const handleSave = async () => {
    const qty = Number(orderQty);
    if (!orderQty || qty <= 0) {
      setError('Order Quantity is required and must be greater than 0.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(job.id, { order_quantity: qty, remarks: remarks.trim() }, isPaperPlanned);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: '#0d1228', border: '1px solid #1e2d50', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, #0d1228, #141c35)', borderBottom: '1px solid #1e2d50' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#00ccf0' }}>
              Repeat Order
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#3d5070' }}>
              {job.customer_name} — {job.job_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(224,64,251,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Paper Planned warning */}
          {isPaperPlanned && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
            >
              <div className="font-bold mb-1">⚠ Paper Already Planned</div>
              <div style={{ color: '#f5d87a', fontSize: 12 }}>
                This job is marked as <strong>Paper Planned</strong>. Because paper has already
                been planned for the original quantity, this repeat order will be saved as a
                <strong> new independent job</strong>. The Paper Planned status will also be
                removed from the original job.
              </div>
            </div>
          )}

          {/* Read-only job details */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#141c35', border: '1px solid #1e2d50' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3d5070' }}>
              Existing Job Details (read-only)
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Customer',      job.customer_name],
                ['Job Name',      job.job_name],
                ['Artworks',      job.artworks || '—'],
                ['Box Size',      fmtBox(job)],
                ['GSM',           String(job.gsm)],
                ['Paper Quality', job.paper_quality],
                ['Sheet Size',    `${job.sheet_length} × ${job.sheet_width} cm`],
                ['UPS',           String(job.ups)],
                ['Printing Type', PRINTING_LABEL[job.printing_type] || job.printing_type],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-xs" style={{ color: '#3d5070' }}>{label}</span>
                  <div className="font-medium" style={{ color: '#94a3b8' }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="pt-2" style={{ borderTop: '1px solid #1e2d50' }}>
              <span className="text-xs" style={{ color: '#3d5070' }}>Original Order Qty</span>
              <div className="font-bold text-white">{job.order_quantity.toLocaleString('en-IN')}</div>
              {job.repeat_order_count > 0 && (
                <div className="text-xs mt-0.5" style={{ color: '#e040fb' }}>
                  + {job.repeat_order_count} repeat order{job.repeat_order_count > 1 ? 's' : ''} · Total so far:{' '}
                  <strong>{(job.order_quantity + job.repeat_total_qty).toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Editable: Order Quantity */}
          <div>
            <label className="form-label">
              New Order Quantity <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 5000"
              value={orderQty}
              min={1}
              onChange={e => { setOrderQty(e.target.value); setError(''); }}
            />
            {error && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>{error}</p>
            )}
          </div>

          {/* Editable: Remarks */}
          <div>
            <label className="form-label">Remarks (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Any notes about this order..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex gap-3 shrink-0"
          style={{ borderTop: '1px solid #1e2d50', background: '#0d1228' }}
        >
          <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex-1"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : isPaperPlanned
                ? 'Create New Job'
                : 'Add Repeat Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
