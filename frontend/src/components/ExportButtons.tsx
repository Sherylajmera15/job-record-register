'use client';
import { useState } from 'react';
import { jobsApi } from '@/lib/api';
import { ExportRange } from '@/types';
import ExportRangeModal from './ExportRangeModal';

interface Props {
  search: string;
  totalFiltered: number;
}

export default function ExportButtons({ search, totalFiltered }: Props) {
  const [pending, setPending] = useState<'excel' | 'pdf' | null>(null);

  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  const handleConfirm = (range: ExportRange) => {
    if (pending === 'excel') download(jobsApi.excelUrl(search || undefined, range));
    if (pending === 'pdf') download(jobsApi.pdfUrl(search || undefined, range));
    setPending(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium mr-1" style={{ color: '#3d5070' }}>
        {search ? `Export ${totalFiltered} filtered` : `Export all ${totalFiltered}`}:
      </span>
      <button
        onClick={() => setPending('excel')}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
        style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.25)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.15)'; }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel
      </button>
      <button
        onClick={() => setPending('pdf')}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
        style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.25)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        PDF
      </button>

      {pending && (
        <ExportRangeModal
          kind={pending}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
