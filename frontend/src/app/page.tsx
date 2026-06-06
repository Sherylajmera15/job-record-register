'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Job, JobCreate, DualDashboardStats, SortOption, ToastMsg } from '@/types';
import { jobsApi, dashboardApi } from '@/lib/api';
import Dashboard from '@/components/Dashboard';
import JobForm from '@/components/JobForm';
import JobTable from '@/components/JobTable';
import SearchSort from '@/components/SearchSort';
import ExportButtons from '@/components/ExportButtons';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import Toast from '@/components/Toast';

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DualDashboardStats | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

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

  const handleSave = async (data: JobCreate) => {
    try {
      if (editJob) {
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

  const handleEdit = (job: Job) => {
    setEditJob(job);
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await jobsApi.remove(deleteTarget.id);
      toast(`Job "${deleteTarget.job_name}" deleted.`);
      setDeleteTarget(null);
      await fetchJobs();
      await fetchStats();
    } catch {
      toast('Failed to delete job.', 'error');
    }
  };

  const openCreate = () => {
    setEditJob(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditJob(null);
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
            {/* Company logo */}
            <div className="shrink-0 rounded-xl overflow-hidden shadow-md" style={{ width: 44, height: 44 }}>
              <Image
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTdaDS48M9wuMBtTT-qCLFNbVV1nI9iWstHPEqdQaIaQ&s"
                alt="Shri Neminath Printers & Packaging"
                width={44}
                height={44}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                priority
                unoptimized
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

        {/* Dashboard */}
        <Dashboard stats={stats} loading={loadingStats} />

        {/* Controls bar */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white">Job Records</h2>
                {!loadingJobs && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,204,240,0.15)', color: '#00ccf0', border: '1px solid rgba(0,204,240,0.3)' }}
                  >
                    {jobs.length}
                  </span>
                )}
              </div>
              <ExportButtons search={search} totalFiltered={jobs.length} />
            </div>
            <SearchSort
              search={search}
              sortBy={sortBy}
              onSearchChange={setSearch}
              onSortChange={handleSortChange}
            />
          </div>
        </div>

        {/* Table */}
        <JobTable
          jobs={jobs}
          loading={loadingJobs}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

        {/* Record count footer */}
        {!loadingJobs && jobs.length > 0 && (
          <p className="text-center text-xs mt-4 pb-6" style={{ color: '#3d5070' }}>
            Showing {jobs.length} record{jobs.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        )}
      </main>

      {/* Job Form Drawer */}
      {showForm && (
        <JobForm editJob={editJob} onSave={handleSave} onClose={closeForm} />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          job={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
