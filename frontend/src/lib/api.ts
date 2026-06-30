import axios from 'axios';
import { Job, JobCreate, DualDashboardStats, ExportRange, SortOption, PartialEntry, PartialEntryCreate, RepeatOrder, RepeatOrderCreate } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const http = axios.create({ baseURL: BASE });

const exportQuery = (search?: string, range?: ExportRange) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (range?.from) params.set('from_date', range.from);
  if (range?.to) params.set('to_date', range.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const jobsApi = {
  list: (search?: string, sortBy?: SortOption) =>
    http.get<Job[]>('/api/jobs', { params: { search: search || undefined, sort_by: sortBy } }),

  create: (data: JobCreate) => http.post<Job>('/api/jobs', data),

  update: (id: number, data: Partial<JobCreate>) => http.put<Job>(`/api/jobs/${id}`, data),

  remove: (id: number) => http.delete(`/api/jobs/${id}`),

  companies: () => http.get<string[]>('/api/jobs/companies'),

  togglePaperPlanned: (id: number) => http.patch<Job>(`/api/jobs/${id}/paper-planned`),

  bulkPaperPlanned: (jobIds: number[], planned: boolean) =>
    http.post<Job[]>('/api/jobs/bulk/paper-planned', { job_ids: jobIds, planned }),

  excelUrl: (search?: string, range?: ExportRange) =>
    `${BASE}/api/jobs/export/excel${exportQuery(search, range)}`,

  pdfUrl: (search?: string, range?: ExportRange) =>
    `${BASE}/api/jobs/export/pdf${exportQuery(search, range)}`,

  selectedExcelUrl: (ids: number[]) =>
    `${BASE}/api/jobs/export/selected/excel?ids=${ids.join(',')}`,

  selectedPdfUrl: (ids: number[]) =>
    `${BASE}/api/jobs/export/selected/pdf?ids=${ids.join(',')}`,
};

export const gsmApi = {
  values: () => http.get<number[]>('/api/jobs/gsm-values'),
};

export const repeatOrderApi = {
  list: (jobId: number) =>
    http.get<RepeatOrder[]>(`/api/jobs/${jobId}/repeat-orders`),

  create: (jobId: number, data: RepeatOrderCreate) =>
    http.post<RepeatOrder>(`/api/jobs/${jobId}/repeat-orders`, data),
};

export const partialApi = {
  list: (search?: string) =>
    http.get<PartialEntry[]>('/api/partial-entries', { params: { search: search || undefined } }),

  create: (data: PartialEntryCreate) => http.post<PartialEntry>('/api/partial-entries', data),

  update: (id: number, data: PartialEntryCreate) =>
    http.put<PartialEntry>(`/api/partial-entries/${id}`, data),

  remove: (id: number) => http.delete(`/api/partial-entries/${id}`),

  complete: (id: number, job: JobCreate) =>
    http.post<Job>(`/api/partial-entries/${id}/complete`, job),
};

export const supplierApi = {
  excelUrl: (ids: number[]) =>
    `${BASE}/api/jobs/export/supplier/excel?ids=${ids.join(',')}`,

  pdfUrl: (ids: number[]) =>
    `${BASE}/api/jobs/export/supplier/pdf?ids=${ids.join(',')}`,
};

export const dashboardApi = {
  stats: () => http.get<DualDashboardStats>('/api/dashboard'),
};
