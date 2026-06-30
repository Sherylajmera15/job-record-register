'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Job, JobCreate, DualDashboardStats, SortOption, ToastMsg, PartialEntry, PartialEntryCreate, RepeatOrderCreate } from '@/types';
import { jobsApi, dashboardApi, partialApi, repeatOrderApi } from '@/lib/api';
import Dashboard from '@/components/Dashboard';
import JobForm from '@/components/JobForm';
import JobTable from '@/components/JobTable';
import SearchSort from '@/components/SearchSort';
import ExportButtons from '@/components/ExportButtons';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import PartialEntriesSection from '@/components/PartialEntriesSection';
import SupplierExportModal from '@/components/SupplierExportModal';
import RepeatOrderModal from '@/components/RepeatOrderModal';
import JobDetailsDrawer from '@/components/JobDetailsDrawer';
import DuplicateJobModal, { DuplicateMatch } from '@/components/DuplicateJobModal';
import Toast from '@/components/Toast';

export default function HomePage() {
  const [jobs,         setJobs]         = useState<Job[]>([]);
  const [stats,        setStats]        = useState<DualDashboardStats | null>(null);
  const [loadingJobs,  setLoadingJobs]  = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [search,  setSearch]  = useState('');
  const [sortBy,  setSortBy]  = useState<SortOption>('newest');

  const [showForm,  setShowForm]  = useState(false);
  const [editJob,   setEditJob]   = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  // Repeat Order
  const [repeatOrderJob, setRepeatOrderJob] = useState<Job | null>(null);

  // Duplicate detection
  const [duplicateMatches,  setDuplicateMatches]  = useState<DuplicateMatch[]>([]);
  const [pendingSaveData,   setPendingSaveData]   = useState<JobCreate | null>(null);

  // Job Details Drawer
  const [detailsJob, setDetailsJob] = useState<Job | null>(null);

  // Supplier export selection
  const [selectedJobIds,    setSelectedJobIds]    = useState<Set<number>>(new Set());
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Partial entries
  const [completingPartialId, setCompletingPartialId] = useState<number | null>(null);
  const [partialsRefreshKey,  setPartialsRefreshKey]  = useState(0);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((text: string, kind: ToastMsg['kind'] = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, kind }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await dashboardApi.stats();
      setStats(res.data);
    } catch {
      // stats are non-critical
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchJobs = useCallback(async (q = search, s = sortBy) => {
    try {
      setLoadingJobs(true);
      const res = await jobsApi.list(q || undefined, s);
      setJobs(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(msg || 'Failed to load jobs.', 'error');
    } finally {
      setLoadingJobs(false);
    }
  }, [search, sortBy, toast]);

  useEffect(() => {
    fetchJobs();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchJobs(search, sortBy), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search, sortBy, fetchJobs]);

  const handleSortChange = (s: SortOption) => {
    setSortBy(s);
    fetchJobs(search, s);
  };

  // ── Duplicate detection ────────────────────────────────────────────────────

  const checkForDuplicates = async (jobName: string, artworks: string): Promise<DuplicateMatch[]> => {
    const normName     = jobName.trim().toLowerCase();
    const normArtworks = artworks.trim().toLowerCase();

    // Both fields must be non-empty and identical for a duplicate to register
    if (!normName || !normArtworks) return [];

    const found: DuplicateMatch[] = [];

    // Check in-memory jobs (active + paper planned)
    for (const job of jobs) {
      const jobArtworks = (job.artworks || '').trim().toLowerCase();
      if (
        job.job_name.trim().toLowerCase() === normName &&
        jobArtworks !== '' &&
        jobArtworks === normArtworks
      ) {
        found.push({ type: job.paper_planned ? 'paper_planned' : 'active', job });
      }
    }

    // Check partial entries
    try {
      const res = await partialApi.list();
      for (const p of res.data) {
        const pName     = (p.job_name  || '').trim().toLowerCase();
        const pArtworks = (p.artworks  || '').trim().toLowerCase();
        if (pName === normName && pArtworks !== '' && pArtworks === normArtworks) {
          found.push({ type: 'partial', partial: p });
        }
      }
    } catch {
      // non-critical — if partial check fails, still show job matches
    }

    return found;
  };

  // ── Job form save ──────────────────────────────────────────────────────────

  const doSave = async (data: JobCreate) => {
    try {
      if (completingPartialId !== null) {
        await partialApi.complete(completingPartialId, data);
        toast('Entry completed and added to Job Records.');
        setCompletingPartialId(null);
        setPartialsRefreshKey(k => k + 1);
      } else if (editJob) {
        await jobsApi.update(editJob.id, data);
        toast(`Job "${data.job_name}" updated successfully.`);
      } else {
        await jobsApi.create(data);
        toast(`Job "${data.job_name}" created successfully.`);
      }
      setShowForm(false);
      setEditJob(null);
      await fetchJobs();
      await fetchStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(msg || 'Failed to save job. Please try again.', 'error');
    }
  };

  const handleSave = async (data: JobCreate) => {
    // Duplicate check only when creating a brand-new job (not editing, not completing partial)
    const isNewJob = completingPartialId === null && !editJob;
    if (isNewJob) {
      const matches = await checkForDuplicates(data.job_name, data.artworks);
      if (matches.length > 0) {
        setPendingSaveData(data);
        setDuplicateMatches(matches);
        return; // Hold — let the user decide
      }
    }
    await doSave(data);
  };

  // ── Duplicate modal handlers ───────────────────────────────────────────────

  const handleDuplicateRepeatOrder = (job: Job) => {
    // Dismiss modal + job form, then open Repeat Order flow for the existing job
    setDuplicateMatches([]);
    setPendingSaveData(null);
    setShowForm(false);
    setEditJob(null);
    setRepeatOrderJob(job);
  };

  const handleDuplicateCreateAnyway = async () => {
    const data = pendingSaveData;
    setDuplicateMatches([]);
    setPendingSaveData(null);
    if (data) await doSave(data);
  };

  const handleDuplicateCancel = () => {
    setDuplicateMatches([]);
    setPendingSaveData(null);
    // Leave the job form open so the user can make changes
  };

  const handleSavePartial = async (data: PartialEntryCreate) => {
    try {
      await partialApi.create(data);
      toast('Draft saved to Partial Entries.', 'success');
      setShowForm(false);
      setEditJob(null);
      setPartialsRefreshKey(k => k + 1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(msg || 'Failed to save draft.', 'error');
    }
  };

  // ── Edit / Delete ──────────────────────────────────────────────────────────

  const handleEdit = (job: Job) => {
    setCompletingPartialId(null);
    setEditJob(job);
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await jobsApi.remove(deleteTarget.id);
      toast(`Job "${deleteTarget.job_name}" deleted.`);
      setDeleteTarget(null);
      setSelectedJobIds(prev => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      await fetchJobs();
      await fetchStats();
    } catch {
      toast('Failed to delete job.', 'error');
    }
  };

  // ── Repeat Order ───────────────────────────────────────────────────────────

  const handleRepeatOrderSave = async (
    jobId: number,
    data: RepeatOrderCreate,
    isPaperPlanned: boolean,
  ) => {
    try {
      const sourceJob = jobs.find(j => j.id === jobId);
      if (!sourceJob) return;

      if (isPaperPlanned) {
        // Create a brand-new independent job for the new quantity
        await jobsApi.create({
          customer_name: sourceJob.customer_name,
          job_name:      sourceJob.job_name,
          artworks:      sourceJob.artworks,
          length:        sourceJob.length,
          width:         sourceJob.width,
          height:        sourceJob.height,
          gsm:           sourceJob.gsm,
          paper_quality: sourceJob.paper_quality,
          order_quantity: data.order_quantity,
          sheet_length:  sourceJob.sheet_length,
          sheet_width:   sourceJob.sheet_width,
          ups:           sourceJob.ups,
          printing_type: sourceJob.printing_type,
          remarks:       data.remarks || '',
        });
        // Remove Paper Planned from the original job (total situation has changed)
        await jobsApi.togglePaperPlanned(jobId);
        toast(`New job created for ${data.order_quantity.toLocaleString('en-IN')} units. Paper Planned removed from original.`);
      } else {
        // Normal repeat order under the existing job
        await repeatOrderApi.create(jobId, data);
        toast(`Repeat order of ${data.order_quantity.toLocaleString('en-IN')} units added.`);
      }

      setRepeatOrderJob(null);
      await fetchJobs();
      await fetchStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(msg || 'Failed to save repeat order.', 'error');
    }
  };

  // ── Paper Planned toggle ───────────────────────────────────────────────────

  const handleTogglePaperPlanned = async (job: Job) => {
    try {
      await jobsApi.togglePaperPlanned(job.id);
      const verb = job.paper_planned ? 'removed from' : 'marked on';
      toast(`Paper Planned ${verb} "${job.job_name}".`);
      await fetchJobs();
    } catch {
      toast('Failed to update Paper Planned status.', 'error');
    }
  };

  // ── Bulk Paper Planned ─────────────────────────────────────────────────────

  const handleBulkPaperPlanned = async (planned: boolean) => {
    const ids = Array.from(selectedJobIds);
    if (!ids.length) return;
    try {
      await jobsApi.bulkPaperPlanned(ids, planned);
      toast(
        planned
          ? `${ids.length} job${ids.length > 1 ? 's' : ''} marked as Paper Planned.`
          : `Paper Planned removed from ${ids.length} job${ids.length > 1 ? 's' : ''}.`,
      );
      await fetchJobs();
    } catch {
      toast('Failed to update Paper Planned status.', 'error');
    }
  };

  // ── Complete Partial ───────────────────────────────────────────────────────

  const handleOpenCompletePartial = useCallback((partial: PartialEntry) => {
    setCompletingPartialId(partial.id);
    setEditJob({
      id: -1,
      customer_name: partial.customer_name ?? '',
      job_name:      partial.job_name ?? '',
      artworks:      partial.artworks ?? '',
      length:        partial.length ?? null,
      width:         partial.width ?? null,
      height:        partial.height ?? null,
      gsm:           partial.gsm ?? 0,
      paper_quality: partial.paper_quality ?? '',
      order_quantity: partial.order_quantity ?? 0,
      sheet_length:  partial.sheet_length ?? 0,
      sheet_width:   partial.sheet_width ?? 0,
      ups:           partial.ups ?? 0,
      printing_type: partial.printing_type || 'outer',
      remarks:       partial.remarks ?? '',
      base_sheets:   0,
      wastage_percentage: 0,
      final_sheets:  0,
      total_kg:      0,
      created_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
      paper_planned: false,
      repeat_order_count: 0,
      repeat_total_qty:   0,
    });
    setShowForm(true);
  }, []);

  const openCreate = () => {
    setEditJob(null);
    setCompletingPartialId(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditJob(null);
    setCompletingPartialId(null);
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedJobIds(prev => {
      if (prev.size === jobs.length && jobs.length > 0) return new Set<number>();
      return new Set(jobs.map(j => j.id));
    });
  }, [jobs]);

  const formMode = completingPartialId !== null ? 'complete' : editJob ? 'edit' : 'create';

  const downloadSelected = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  return (
    <div className="min-h-screen" style={{ background: '#06091a' }}>
      {/* Top Header */}
      <header
        className="text-white shadow-xl sticky top-0 z-30"
        style={{ background: 'linear-gradient(to right, #06091a, #0d1530, #06091a)', borderBottom: '1px solid #1e2d50' }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0" style={{ width: 44, height: 44 }}>
              <Image
                src="/logo.png"
                alt="Shri Neminath Printers & Packaging"
                width={44}
                height={44}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                priority
              />
            </div>
            <div className="min-w-0">
              <h1
                className="text-base sm:text-lg font-extrabold tracking-tight leading-tight truncate font-display"
                style={{ color: '#00ccf0' }}
              >
                Shri Neminath Printers &amp; Packaging
              </h1>
              <p className="text-xs font-medium hidden sm:block" style={{ color: '#e040fb' }}>
                Job Record Register System
              </p>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary shrink-0 text-sm px-4 py-2.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Job</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        <Dashboard stats={stats} loading={loadingStats} />

        {/* Controls bar */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

              {/* Left: title + badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-white">Job Records</h2>
                {!loadingJobs && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,204,240,0.15)', color: '#00ccf0', border: '1px solid rgba(0,204,240,0.3)' }}
                  >
                    {jobs.length}
                  </span>
                )}
                {selectedJobIds.size > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(224,64,251,0.15)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.3)' }}
                  >
                    {selectedJobIds.size} selected
                  </span>
                )}
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-wrap items-center gap-2">

                {/* Bulk Paper Planned buttons (only when selection is active) */}
                {selectedJobIds.size > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkPaperPlanned(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.22)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.12)'; }}
                      title="Mark all selected jobs as Paper Planned"
                    >
                      ✓ Mark Paper Planned ({selectedJobIds.size})
                    </button>
                    <button
                      onClick={() => handleBulkPaperPlanned(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(100,116,139,0.22)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(100,116,139,0.12)'; }}
                      title="Remove Paper Planned from all selected jobs"
                    >
                      Remove Paper Planned ({selectedJobIds.size})
                    </button>
                  </>
                )}

                {/* Supplier Export */}
                {selectedJobIds.size > 0 && (
                  <button
                    onClick={() => setShowSupplierModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.25)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.15)'; }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Supplier ({selectedJobIds.size})
                  </button>
                )}

                {/* Export Selected — full format */}
                {selectedJobIds.size > 0 && (
                  <>
                    <button
                      onClick={() => downloadSelected(jobsApi.selectedExcelUrl(Array.from(selectedJobIds)))}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.15)'; }}
                      title="Export selected jobs as full Excel record"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Selected Excel ({selectedJobIds.size})
                    </button>
                    <button
                      onClick={() => downloadSelected(jobsApi.selectedPdfUrl(Array.from(selectedJobIds)))}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; }}
                      title="Export selected jobs as full PDF record"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Selected PDF ({selectedJobIds.size})
                    </button>
                  </>
                )}

                <ExportButtons search={search} totalFiltered={jobs.length} />
              </div>
            </div>

            <SearchSort
              search={search}
              sortBy={sortBy}
              onSearchChange={setSearch}
              onSortChange={handleSortChange}
            />
          </div>
        </div>

        {/* Job Table */}
        <JobTable
          jobs={jobs}
          loading={loadingJobs}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onRepeatOrder={setRepeatOrderJob}
          onTogglePaperPlanned={handleTogglePaperPlanned}
          onViewDetails={setDetailsJob}
          selectedIds={selectedJobIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />

        {/* Record count footer */}
        {!loadingJobs && jobs.length > 0 && (
          <p className="text-center text-xs mt-4" style={{ color: '#3d5070' }}>
            Showing {jobs.length} record{jobs.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
            {selectedJobIds.size > 0 ? ` · ${selectedJobIds.size} selected` : ''}
          </p>
        )}

        {/* Partial Entries Section */}
        <PartialEntriesSection
          onComplete={handleOpenCompletePartial}
          refreshKey={partialsRefreshKey}
        />

        <div className="pb-6" />
      </main>

      {/* Job Form Drawer */}
      {showForm && (
        <JobForm
          editJob={editJob}
          mode={formMode}
          onSave={handleSave}
          onSavePartial={formMode === 'create' ? handleSavePartial : undefined}
          onClose={closeForm}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          job={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Supplier Export Modal */}
      {showSupplierModal && (
        <SupplierExportModal
          selectedIds={Array.from(selectedJobIds)}
          onClose={() => setShowSupplierModal(false)}
        />
      )}

      {/* Repeat Order Modal */}
      {repeatOrderJob && (
        <RepeatOrderModal
          job={repeatOrderJob}
          onSave={handleRepeatOrderSave}
          onClose={() => setRepeatOrderJob(null)}
        />
      )}

      {/* Job Details Drawer */}
      {detailsJob && (
        <JobDetailsDrawer
          job={detailsJob}
          onClose={() => setDetailsJob(null)}
        />
      )}

      {/* Duplicate Job Detection Modal */}
      {duplicateMatches.length > 0 && (
        <DuplicateJobModal
          matches={duplicateMatches}
          onRepeatOrder={handleDuplicateRepeatOrder}
          onCreateAnyway={handleDuplicateCreateAnyway}
          onCancel={handleDuplicateCancel}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
