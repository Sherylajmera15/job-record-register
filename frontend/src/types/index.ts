export interface Job {
  id: number;
  customer_name: string;
  job_name: string;
  artworks: string;
  length: number | null;
  width: number | null;
  height: number | null;
  gsm: number;
  paper_quality: string;
  order_quantity: number;
  sheet_length: number;
  sheet_width: number;
  ups: number;
  base_sheets: number;
  wastage_percentage: number;
  final_sheets: number;
  total_kg: number;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  customer_name: string;
  job_name: string;
  artworks: string;
  length: number | null;
  width: number | null;
  height: number | null;
  gsm: number;
  paper_quality: string;
  order_quantity: number;
  sheet_length: number;
  sheet_width: number;
  ups: number;
}

export interface DashboardStats {
  total_jobs: number;
  total_sheets: number;
  total_kg: number;
  jobs_this_month: number;
}

export interface DualDashboardStats {
  month: DashboardStats;
  overall: DashboardStats;
}

export interface CalcResult {
  base_sheets: number;
  wastage_percentage: number;
  final_sheets: number;
  total_kg: number;
}

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'customer_az'
  | 'customer_za'
  | 'job_az'
  | 'job_za'
  | 'order_qty'
  | 'sheets'
  | 'kg';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMsg {
  id: string;
  kind: ToastKind;
  text: string;
}
