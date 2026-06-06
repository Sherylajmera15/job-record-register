import axios from 'axios';
import { Job, JobCreate, DualDashboardStats, SortOption } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const http = axios.create({ baseURL: BASE });

export const jobsApi = {
  list: (search?: string, sortBy?: SortOption) =>
    http.get<Job[]>('/api/jobs', { params: { search: search || undefined, sort_by: sortBy } }),

  create: (data: JobCreate) => http.post<Job>('/api/jobs', data),

  update: (id: number, data: Partial<JobCreate>) => http.put<Job>(`/api/jobs/${id}`, data),

  remove: (id: number) => http.delete(`/api/jobs/${id}`),

  companies: () => http.get<string[]>('/api/jobs/companies'),

  excelUrl: (search?: string) =>
    `${BASE}/api/jobs/export/excel${search ? `?search=${encodeURIComponent(search)}` : ''}`,

  pdfUrl: (search?: string) =>
    `${BASE}/api/jobs/export/pdf${search ? `?search=${encodeURIComponent(search)}` : ''}`,
};

export const dashboardApi = {
  stats: () => http.get<DualDashboardStats>('/api/dashboard'),
};
