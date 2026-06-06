'use client';
import { CalcResult } from '@/types';

interface Props {
  result: CalcResult | null;
}

export default function CalculationPreview({ result }: Props) {
  if (!result) {
    return (
      <div
        className="rounded-xl p-5 text-center text-sm"
        style={{ border: '2px dashed #1e2d50', background: '#0a0f20', color: '#3d5070' }}
      >
        Complete the form above to see live calculations
      </div>
    );
  }

  const items = [
    { label: 'Base Sheets', value: result.base_sheets.toLocaleString('en-IN'), color: '#e2e8f0' },
    { label: 'Wastage Applied', value: `${result.wastage_percentage}%`, color: '#fbbf24' },
    { label: 'Final Sheets Required', value: result.final_sheets.toLocaleString('en-IN'), color: '#00ccf0' },
    { label: 'Total KG Required', value: `${result.total_kg.toLocaleString('en-IN')} kg`, color: '#34d399' },
  ];

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: '#0a0f20', border: '2px solid rgba(0,204,240,0.25)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5" style={{ color: '#00ccf0' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#00ccf0' }}>Live Calculation Preview</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg p-3 shadow-sm"
            style={{ background: '#141c35', border: '1px solid #1e2d50' }}
          >
            <div className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: '#3d5070' }}>{label}</div>
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
