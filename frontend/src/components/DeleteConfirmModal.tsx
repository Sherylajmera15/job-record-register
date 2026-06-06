'use client';
import { useState } from 'react';
import { Job } from '@/types';

interface Props {
  job: Job;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ job, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const handleFinalDelete = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: '#0d1228', border: '1px solid #1e2d50' }}
      >
        {step === 1 ? (
          <>
            <div className="px-6 py-5" style={{ background: '#141c35', borderBottom: '1px solid #1e2d50' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#fbbf24' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Delete this job?</h2>
                  <p className="text-sm mt-0.5" style={{ color: '#3d5070' }}>Step 1 of 2</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>You are about to delete:</p>
              <div
                className="rounded-lg p-3 mb-5"
                style={{ background: '#141c35', border: '1px solid #1e2d50' }}
              >
                <p className="font-semibold text-white">{job.job_name}</p>
                <p className="text-sm" style={{ color: '#3d5070' }}>{job.customer_name}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onCancel} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={() => setStep(2)} className="btn-danger flex-1">
                  Yes, Delete
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5" style={{ background: '#1a0f0f', borderBottom: '1px solid rgba(248,113,113,0.2)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: '#f87171' }}>This cannot be undone!</h2>
                  <p className="text-sm mt-0.5" style={{ color: '#3d5070' }}>Step 2 of 2 — Final confirmation</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>
                Are you <strong className="text-white">absolutely sure</strong> you want to permanently delete the job{' '}
                <span className="font-semibold text-white">&ldquo;{job.job_name}&rdquo;</span> for{' '}
                <span className="font-semibold text-white">{job.customer_name}</span>? This record will be lost forever.
              </p>
              <div className="flex gap-3">
                <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
                  Keep It
                </button>
                <button onClick={handleFinalDelete} className="btn-danger flex-1" disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
