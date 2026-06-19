'use client';
import { supplierApi } from '@/lib/api';

interface Props {
  selectedIds: number[];
  onClose: () => void;
}

export default function SupplierExportModal({ selectedIds, onClose }: Props) {
  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.click();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0d1228', border: '1px solid #1e2d50' }}
      >
        <div className="px-6 py-5" style={{ background: '#141c35', borderBottom: '1px solid #1e2d50' }}>
          <h2 className="text-base font-bold text-white">Export to Supplier</h2>
          <p className="text-sm mt-0.5" style={{ color: '#3d5070' }}>
            {selectedIds.length} job{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-lg p-3 mb-5 text-xs" style={{ background: '#141c35', border: '1px solid #1e2d50' }}>
            <p className="font-semibold mb-1" style={{ color: '#94a3b8' }}>Included columns:</p>
            <p style={{ color: '#34d399' }}>Paper Quality · GSM · Sheet Length · Sheet Width · Final Sheets · Total KG</p>
            <p className="mt-2" style={{ color: '#f87171' }}>
              Excluded: Customer Name · Job Name · Artworks · Order Quantity
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => download(supplierApi.excelUrl(selectedIds))}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.15)'; }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as Excel
            </button>

            <button
              onClick={() => download(supplierApi.pdfUrl(selectedIds))}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export as PDF
            </button>
          </div>

          <button onClick={onClose} className="btn-secondary w-full mt-3">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
