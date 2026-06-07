'use client';
import { useState } from 'react';
import { ExportRange, ExportRangeOption } from '@/types';

interface Props {
  kind: 'excel' | 'pdf';
  onConfirm: (range: ExportRange) => void;
  onCancel: () => void;
}

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfWeek = (d: Date) => {
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const offset = day === 0 ? 6 : day - 1; // days since Monday
  const start = new Date(d);
  start.setDate(d.getDate() - offset);
  return start;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const OPTIONS: { value: ExportRangeOption; label: string; hint: string }[] = [
  { value: 'today', label: 'Today', hint: "Only today's records" },
  { value: 'this_week', label: 'This Week', hint: 'Monday through today' },
  { value: 'this_month', label: 'This Month', hint: '1st of this month through today' },
  { value: 'all_time', label: 'All Time', hint: 'Every record (no filtering)' },
  { value: 'custom', label: 'Custom Date Range', hint: 'Pick your own from / to dates' },
];

export default function ExportRangeModal({ kind, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<ExportRangeOption>('all_time');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const label = kind === 'excel' ? 'Excel' : 'PDF';

  const handleExport = () => {
    const today = new Date();

    if (selected === 'all_time') {
      onConfirm({});
      return;
    }

    if (selected === 'today') {
      const iso = toISODate(today);
      onConfirm({ from: iso, to: iso });
      return;
    }

    if (selected === 'this_week') {
      onConfirm({ from: toISODate(startOfWeek(today)), to: toISODate(today) });
      return;
    }

    if (selected === 'this_month') {
      onConfirm({ from: toISODate(startOfMonth(today)), to: toISODate(today) });
      return;
    }

    // custom
    if (!from || !to) {
      setError('Please select both a from and to date.');
      return;
    }
    if (from > to) {
      setError('The "from" date must be before the "to" date.');
      return;
    }
    setError('');
    onConfirm({ from, to });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: '#0d1228', border: '1px solid #1e2d50' }}
      >
        <div className="px-6 py-5" style={{ background: '#141c35', borderBottom: '1px solid #1e2d50' }}>
          <h2 className="text-base font-bold text-white">Export {label} — choose a date range</h2>
          <p className="text-sm mt-0.5" style={{ color: '#3d5070' }}>
            Filtered by the record&apos;s creation date.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-2">
            {OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors"
                style={{
                  background: selected === opt.value ? 'rgba(0,204,240,0.1)' : '#141c35',
                  border: selected === opt.value ? '1px solid rgba(0,204,240,0.4)' : '1px solid #1e2d50',
                }}
              >
                <input
                  type="radio"
                  name="export-range"
                  className="mt-1"
                  checked={selected === opt.value}
                  onChange={() => { setSelected(opt.value); setError(''); }}
                />
                <span>
                  <span className="block text-sm font-semibold text-white">{opt.label}</span>
                  <span className="block text-xs" style={{ color: '#3d5070' }}>{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {selected === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={from}
                  max={to || undefined}
                  onChange={e => { setFrom(e.target.value); setError(''); }}
                />
              </div>
              <div>
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={to}
                  min={from || undefined}
                  onChange={e => { setTo(e.target.value); setError(''); }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm mt-3" style={{ color: '#f87171' }}>{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleExport} className="btn-primary flex-1">
              Export {label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
