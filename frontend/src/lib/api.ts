import axios from 'axios';
import { Job, JobCreate, DualDashboardStats, ExportRange, SortOption } from '@/types';

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

  excelUrl: (search?: string, range?: ExportRange) =>
    `${BASE}/api/jobs/export/excel${exportQuery(search, range)}`,

  pdfUrl: (search?: string, range?: ExportRange) =>
    `${BASE}/api/jobs/export/pdf${exportQuery(search, range)}`,
};

export const dashboardApi = {
  stats: () => http.get<DualDashboardStats>('/api/dashboard'),
};
