'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Job, JobCreate, CalcResult } from '@/types';
import { calculateJob } from '@/lib/calculations';
import { jobsApi } from '@/lib/api';
import CalculationPreview from './CalculationPreview';

const GSM_OPTIONS = ['200', '230', '250', '270', '300', '350', 'Other'];
const QUALITY_OPTIONS = ['FBB ITC', 'Saffire XL', 'Grey Back', 'White Back', 'Other'];

interface Props {
  editJob?: Job | null;
  onSave: (data: JobCreate) => Promise<void>;
  onClose: () => void;
}

interface FormState {
  customer_name: string;
  job_name: string;
  artworks: string;
  length: string;
  width: string;
  height: string;
  gsm: string;
  custom_gsm: string;
  paper_quality: string;
  custom_quality: string;
  order_quantity: string;
  sheet_length: string;
  sheet_width: string;
  ups: string;
}

interface Errors {
  [key: string]: string;
}

const emptyForm = (): FormState => ({
  customer_name: '', job_name: '', artworks: '',
  length: '', width: '', height: '',
  gsm: '300', custom_gsm: '',
  paper_quality: 'FBB ITC', custom_quality: '',
  order_quantity: '', sheet_length: '', sheet_width: '', ups: '',
});

export default function JobForm({ editJob, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [calc, setCalc] = useState<CalcResult | null>(null);

  // Company autocomplete
  const [companies, setCompanies] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    jobsApi.companies().then(res => setCompanies(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editJob) { setForm(emptyForm()); return; }
    const isCustomGsm = !GSM_OPTIONS.slice(0, -1).includes(String(editJob.gsm));
    const isCustomQuality = !QUALITY_OPTIONS.slice(0, -1).includes(editJob.paper_quality);
    setForm({
      customer_name: editJob.customer_name,
      job_name: editJob.job_name,
      artworks: editJob.artworks ?? '',
      length: editJob.length != null ? String(editJob.length) : '',
      width: editJob.width != null ? String(editJob.width) : '',
      height: editJob.height != null ? String(editJob.height) : '',
      gsm: isCustomGsm ? 'Other' : String(editJob.gsm),
      custom_gsm: isCustomGsm ? String(editJob.gsm) : '',
      paper_quality: isCustomQuality ? 'Other' : editJob.paper_quality,
      custom_quality: isCustomQuality ? editJob.paper_quality : '',
      order_quantity: String(editJob.order_quantity),
      sheet_length: String(editJob.sheet_length),
      sheet_width: String(editJob.sheet_width),
      ups: String(editJob.ups),
    });
  }, [editJob]);

  useEffect(() => {
    const gsmVal = form.gsm === 'Other' ? Number(form.custom_gsm) : Number(form.gsm);
    setCalc(calculateJob(
      Number(form.order_quantity), Number(form.ups),
      Number(form.sheet_length), Number(form.sheet_width), gsmVal,
    ));
  }, [form.order_quantity, form.ups, form.sheet_length, form.sheet_width, form.gsm, form.custom_gsm]);

  const set = useCallback((field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  // Filtered suggestions based on current input
  const filteredCompanies = companies.filter(c =>
    form.customer_name.trim() !== '' &&
    c.toLowerCase().includes(form.customer_name.toLowerCase()) &&
    c.toLowerCase() !== form.customer_name.toLowerCase()
  );

  const selectCompany = (name: string) => {
    setForm(prev => ({ ...prev, customer_name: name }));
    setErrors(prev => { const n = { ...prev }; delete n.customer_name; return n; });
    setShowSuggestions(false);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.customer_name.trim()) e.customer_name = 'Customer name is required.';
    if (!form.job_name.trim()) e.job_name = 'Job name is required.';
    if (form.gsm === 'Other') {
      if (!form.custom_gsm || Number(form.custom_gsm) <= 0) e.custom_gsm = 'Enter a valid GSM.';
    }
    if (form.paper_quality === 'Other') {
      if (!form.custom_quality.trim()) e.custom_quality = 'Enter paper quality.';
    }
    if (!form.order_quantity || Number(form.order_quantity) <= 0) e.order_quantity = 'Required, must be > 0.';
    if (!form.sheet_length || Number(form.sheet_length) <= 0) e.sheet_length = 'Required, must be > 0.';
    if (!form.sheet_width || Number(form.sheet_width) <= 0) e.sheet_width = 'Required, must be > 0.';
    if (!form.ups || Number(form.ups) <= 0) e.ups = 'Required, must be > 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const gsmVal = form.gsm === 'Other' ? Number(form.custom_gsm) : Number(form.gsm);
      const qualityVal = form.paper_quality === 'Other' ? form.custom_quality.trim() : form.paper_quality;
      await onSave({
        customer_name: form.customer_name.trim(),
        job_name: form.job_name.trim(),
        artworks: form.artworks.trim(),
        length: form.length !== '' ? Number(form.length) : null,
        width: form.width !== '' ? Number(form.width) : null,
        height: form.height !== '' ? Number(form.height) : null,
        gsm: gsmVal,
        paper_quality: qualityVal,
        order_quantity: Number(form.order_quantity),
        sheet_length: Number(form.sheet_length),
        sheet_width: Number(form.sheet_width),
        ups: Number(form.ups),
      });
    } finally {
      setSaving(false);
    }
  };

  const err = (field: string) =>
    errors[field] ? (
      <p className="text-xs mt-1 font-medium" style={{ color: '#f87171' }}>{errors[field]}</p>
    ) : null;

  const inputCls = (field: string) =>
    `form-input ${errors[field] ? 'form-input-error' : ''}`;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="relative h-full w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: '#0d1228', borderLeft: '1px solid #1e2d50' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, #0d1228, #141c35)', borderBottom: '1px solid #1e2d50' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#00ccf0' }}>
              {editJob ? 'Edit Job Record' : 'Create New Job Record'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#3d5070' }}>
              {editJob
                ? `Editing: ${editJob.customer_name} — ${editJob.job_name}`
                : 'Fill in all required fields'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(224,64,251,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* 1. Customer / Company Name (with autocomplete) */}
          <div className="relative">
            <label className="form-label">
              Customer / Company Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              ref={customerInputRef}
              className={inputCls('customer_name')}
              value={form.customer_name}
              onChange={e => {
                set('customer_name')(e);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Amul, Patanjali"
              autoComplete="off"
            />
            {err('customer_name')}
            {showSuggestions && filteredCompanies.length > 0 && (
              <ul
                className="absolute z-50 left-0 right-0 rounded-lg shadow-xl overflow-hidden"
                style={{
                  top: 'calc(100% + 4px)',
                  background: '#141c35',
                  border: '1px solid #1e2d50',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                {filteredCompanies.map(company => (
                  <li
                    key={company}
                    onMouseDown={() => selectCompany(company)}
                    className="px-4 py-2.5 cursor-pointer text-sm transition-colors"
                    style={{ color: '#e2e8f0', borderBottom: '1px solid #1e2d50' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,204,240,0.1)'; (e.currentTarget as HTMLElement).style.color = '#00ccf0'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
                  >
                    {company}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. Job Name */}
          <div>
            <label className="form-label">Job Name <span style={{ color: '#f87171' }}>*</span></label>
            <input
              className={inputCls('job_name')}
              value={form.job_name}
              onChange={set('job_name')}
              placeholder="e.g. Milk Carton, Soap Box"
            />
            {err('job_name')}
          </div>

          {/* 3. Artworks */}
          <div>
            <label className="form-label">Artworks</label>
            <input
              className="form-input"
              value={form.artworks}
              onChange={set('artworks')}
              placeholder="e.g. Version A, Final Design, Artwork 12"
            />
          </div>

          {/* 4. Box Size (Optional) */}
          <div>
            <label className="form-label">
              Box Size (Length × Width × Height in cm)
              <span className="ml-2 text-xs font-normal" style={{ color: '#3d5070' }}>Optional</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  value={form.length}
                  onChange={set('length')}
                  placeholder="Length"
                />
              </div>
              <span className="font-bold text-lg pb-0.5" style={{ color: '#1e2d50' }}>×</span>
              <div className="flex-1">
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  value={form.width}
                  onChange={set('width')}
                  placeholder="Width"
                />
              </div>
              <span className="font-bold text-lg pb-0.5" style={{ color: '#1e2d50' }}>×</span>
              <div className="flex-1">
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  value={form.height}
                  onChange={set('height')}
                  placeholder="Height"
                />
              </div>
            </div>
          </div>

          {/* 5 & 6. Paper GSM + Paper Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Paper GSM <span style={{ color: '#f87171' }}>*</span></label>
              <select className="form-input" value={form.gsm} onChange={set('gsm')}>
                {GSM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {form.gsm === 'Other' && (
                <div className="mt-2">
                  <input
                    className={inputCls('custom_gsm')}
                    type="number"
                    step="any"
                    value={form.custom_gsm}
                    onChange={set('custom_gsm')}
                    placeholder="Enter GSM value"
                  />
                  {err('custom_gsm')}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Paper Quality <span style={{ color: '#f87171' }}>*</span></label>
              <select className="form-input" value={form.paper_quality} onChange={set('paper_quality')}>
                {QUALITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {form.paper_quality === 'Other' && (
                <div className="mt-2">
                  <input
                    className={inputCls('custom_quality')}
                    value={form.custom_quality}
                    onChange={set('custom_quality')}
                    placeholder="Enter paper quality"
                  />
                  {err('custom_quality')}
                </div>
              )}
            </div>
          </div>

          {/* 7. Order Quantity */}
          <div>
            <label className="form-label">Order Quantity <span style={{ color: '#f87171' }}>*</span></label>
            <input
              className={inputCls('order_quantity')}
              type="number"
              min="1"
              step="1"
              value={form.order_quantity}
              onChange={set('order_quantity')}
              placeholder="e.g. 10000"
            />
            {err('order_quantity')}
          </div>

          {/* 8. Sheet Size */}
          <div>
            <label className="form-label">Sheet Size (Length × Width in cm) <span style={{ color: '#f87171' }}>*</span></label>
            <p className="text-xs mb-2" style={{ color: '#3d5070' }}>Paper sheet dimensions, not the box dimensions.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  className={inputCls('sheet_length')}
                  type="number"
                  step="any"
                  value={form.sheet_length}
                  onChange={set('sheet_length')}
                  placeholder="Sheet Length"
                />
                {err('sheet_length')}
              </div>
              <span className="font-bold text-lg pb-0.5" style={{ color: '#1e2d50' }}>×</span>
              <div className="flex-1">
                <input
                  className={inputCls('sheet_width')}
                  type="number"
                  step="any"
                  value={form.sheet_width}
                  onChange={set('sheet_width')}
                  placeholder="Sheet Width"
                />
                {err('sheet_width')}
              </div>
            </div>
          </div>

          {/* 9. UPS */}
          <div>
            <label className="form-label">UPS (boxes per sheet) <span style={{ color: '#f87171' }}>*</span></label>
            <input
              className={inputCls('ups')}
              type="number"
              min="1"
              step="1"
              value={form.ups}
              onChange={set('ups')}
              placeholder="e.g. 4"
            />
            {err('ups')}
          </div>

          {/* Live Calc Preview */}
          <CalculationPreview result={calc} />
        </form>

        {/* Footer */}
        <div
          className="shrink-0 px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid #1e2d50', background: '#0a0f20' }}
        >
          <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="btn-primary px-8"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving...
              </span>
            ) : editJob ? 'Save Changes' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
