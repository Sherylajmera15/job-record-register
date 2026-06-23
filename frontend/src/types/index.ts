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
  printing_type: string;
  outer_ups: number | null;
  inner_ups: number | null;
  total_ups: number | null;
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
  printing_type: string;
  outer_ups?: number | null;
  inner_ups?: number | null;
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

export type ExportRangeOption = 'today' | 'this_week' | 'this_month' | 'all_time' | 'custom';

export interface ExportRange {
  from?: string; // YYYY-MM-DD, omitted for "all_time"
  to?: string;   // YYYY-MM-DD, omitted for "all_time"
}

export interface PartialEntry {
  id: number;
  customer_name: string | null;
  job_name: string | null;
  artworks: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  gsm: number | null;
  paper_quality: string | null;
  order_quantity: number | null;
  sheet_length: number | null;
  sheet_width: number | null;
  ups: number | null;
  printing_type: string | null;
  outer_ups: number | null;
  inner_ups: number | null;
  total_ups: number | null;
  base_sheets: number | null;
  wastage_percentage: number | null;
  final_sheets: number | null;
  total_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartialEntryCreate {
  customer_name?: string | null;
  job_name?: string | null;
  artworks?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  gsm?: number | null;
  paper_quality?: string | null;
  order_quantity?: number | null;
  sheet_length?: number | null;
  sheet_width?: number | null;
  printing_type?: string | null;
  outer_ups?: number | null;
  inner_ups?: number | null;
  notes?: string;
}

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMsg {
  id: string;
  kind: ToastKind;
  text: string;
}
