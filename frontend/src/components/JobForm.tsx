'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Job, JobCreate, CalcResult, PartialEntryCreate } from '@/types';
import { calculateJob } from '@/lib/calculations';
import { jobsApi, gsmApi } from '@/lib/api';
import CalculationPreview from './CalculationPreview';

const QUALITY_OPTIONS = ['FBB ITC', 'Saffire XL', 'Grey Back', 'White Back', 'Other'];

interface Props {
  editJob?: Job | null;
  mode?: 'create' | 'edit' | 'complete';
  onSave: (data: JobCreate) => Promise<void>;
  onSavePartial?: (data: PartialEntryCreate) => Promise<void>;
  onClose: () => void;
}

interface FormState {
  customer_name: string;
  job_name: string;
  artworks: string;
  length: string;
  width: string;
  height: string;
  gsm_input: string;
  paper_quality: string;
  custom_quality: string;
  order_quantity: string;
  sheet_length: string;
  sheet_width: string;
  ups: string;
}

interface Errors { [key: string]: string }

const emptyForm = (): FormState => ({
  customer_name: '', job_name: '', artworks: '',
  length: '', width: '', height: '',
  gsm_input: '',
  paper_quality: 'FBB ITC', custom_quality: '',
  order_quantity: '', sheet_length: '', sheet_width: '', ups: '',
});

export default function JobForm({ editJob, mode = 'create', onSave, onSavePartial, onClose }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [savingPartial, setSavingPartial] = useState(false);
  const [calc, setCalc] = useState<CalcResult | null>(null);

  // Customer autocomplete
  const [companies, setCompanies] = useState<string[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

  // GSM autocomplete
  const [gsmValues, setGsmValues] = useState<number[]>([]);
  const [showGsmSuggestions, setShowGsmSuggestions] = useState(false);

  const customerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    jobsApi.companies().then(res => setCompanies(res.data)).catch(() => {});
    gsmApi.values().then(res => setGsmValues(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editJob) { setForm(emptyForm()); return; }
    const pq = editJob.paper_quality ?? '';
    const isCustomQuality = pq ? !QUALITY_OPTIONS.slice(0, -1).includes(pq) : false;
    setForm({
      customer_name: editJob.customer_name,
      job_name: editJob.job_name,
      artworks: editJob.artworks ?? '',
      length: editJob.length != null ? String(editJob.length) : '',
      width: editJob.width != null ? String(editJob.width) : '',
      height: editJob.height != null ? String(editJob.height) : '',
      gsm_input: editJob.gsm > 0 ? String(editJob.gsm) : '',
      paper_quality: pq ? (isCustomQuality ? 'Other' : pq) : 'FBB ITC',
      custom_quality: isCustomQuality ? pq : '',
      order_quantity: editJob.order_quantity > 0 ? String(editJob.order_quantity) : '',
      sheet_length: editJob.sheet_length > 0 ? String(editJob.sheet_length) : '',
      sheet_width: editJob.sheet_width > 0 ? String(editJob.sheet_width) : '',
      ups: editJob.ups > 0 ? String(editJob.ups) : '',
    });
  }, [editJob]);

  useEffect(() => {
    setCalc(calculateJob(
      Number(form.order_quantity), Number(form.ups),
      Number(form.sheet_length), Number(form.sheet_width), Number(form.gsm_input),
    ));
  }, [form.order_quantity, form.ups, form.sheet_length, form.sheet_width, form.gsm_input]);

  const set = useCallback((field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  // Company suggestions
  const filteredCompanies = companies.filter(c =>
    form.customer_name.trim() !== '' &&
    c.toLowerCase().includes(form.customer_name.toLowerCase()) &&
    c.toLowerCase() !== form.customer_name.toLowerCase()
  );

  const selectCompany = (name: string) => {
    setForm(prev => ({ ...prev, customer_name: name }));
    setErrors(prev => { const n = { ...prev }; delete n.customer_name; return n; });
    setShowCompanySuggestions(false);
  };

  // GSM suggestions
  const filteredGsmValues = form.gsm_input.trim()
    ? gsmValues.filter(v => String(v).includes(form.gsm_input.trim()))
    : gsmValues;

  const selectGsm = (val: string) => {
    setForm(prev => ({ ...prev, gsm_input: val }));
    setErrors(prev => { const n = { ...prev }; delete n.gsm_input; return n; });
    setShowGsmSuggestions(false);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.customer_name.trim()) e.customer_name = 'Customer name is required.';
    if (!form.job_name.trim()) e.job_name = 'Job name is required.';
    if (!form.gsm_input || Number(form.gsm_input) <= 0) e.gsm_input = 'Enter a valid GSM value.';
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

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const qualityVal = form.paper_quality === 'Other' ? form.custom_quality.trim() : form.paper_quality;
      await onSave({
        customer_name: form.customer_name.trim(),
        job_name: form.job_name.trim(),
        artworks: form.artworks.trim(),
        length: form.length !== '' ? Number(form.length) : null,
        width: form.width !== '' ? Number(form.width) : null,
        height: form.height !== '' ? Number(form.height) : null,
        gsm: Number(form.gsm_input),
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

  const handleSavePartial = async () => {
    setSavingPartial(true);
    try {
      const qualityVal = form.paper_quality === 'Other'
        ? (form.custom_quality.trim() || null)
        : (form.paper_quality || null);
      await onSavePartial!({
        customer_name: form.customer_name.trim() || null,
        job_name: form.job_name.trim() || null,
        artworks: form.artworks.trim(),
        length: form.length ? Number(form.length) || null : null,
        width: form.width ? Number(form.width) || null : null,
        height: form.height ? Number(form.height) || null : null,
        gsm: form.gsm_input ? Number(form.gsm_input) || null : null,
        paper_quality: qualityVal,
        order_quantity: form.order_quantity ? Number(form.order_quantity) || null : null,
        sheet_length: form.sheet_length ? Number(form.sheet_length) || null : null,
        sheet_width: form.sheet_width ? Number(form.sheet_width) || null : null,
        ups: form.ups ? Number(form.ups) || null : null,
      });
    } finally {
      setSavingPartial(false);
    }
  };

  const err = (field: string) =>
    errors[field] ? (
      <p className="text-xs mt-1 font-medium" style={{ color: '#f87171' }}>{errors[field]}</p>
    ) : null;

  const inputCls = (field: string) => `form-input ${errors[field] ? 'form-input-error' : ''}`;

  const title =
    mode === 'complete' ? 'Complete Partial Entry' :
    mode === 'edit'     ? 'Edit Job Record' :
                          'Create New Job Record';

  const subtitle =
    mode === 'complete' ? 'Fill all required fields to add to Job Records.' :
    mode === 'edit'     ? `Editing: ${editJob?.customer_name} — ${editJob?.job_name}` :
                          'Fill in all required fields';

  const primaryLabel =
    mode === 'complete' ? 'Complete Entry' :
    mode === 'edit'     ? 'Save Changes' :
                          'Create Job';

  const busy = saving || savingPartial;

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
            <h2 className="text-lg font-bold" style={{ color: mode === 'complete' ? '#34d399' : '#00ccf0' }}>
              {title}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#3d5070' }}>{subtitle}</p>
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

          {/* 1. Customer / Company Name */}
          <div className="relative">
            <label className="form-label">
              Customer / Company Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              ref={customerInputRef}
              className={inputCls('customer_name')}
              value={form.customer_name}
              onChange={e => { set('customer_name')(e); setShowCompanySuggestions(true); }}
              onFocus={() => setShowCompanySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 150)}
              placeholder="e.g. Amul, Patanjali"
              autoComplete="off"
            />
            {err('customer_name')}
            {showCompanySuggestions && filteredCompanies.length > 0 && (
              <ul
                className="absolute z-50 left-0 right-0 rounded-lg shadow-xl"
                style={{ top: 'calc(100% + 4px)', background: '#141c35', border: '1px solid #1e2d50', maxHeight: '180px', overflowY: 'auto' }}
              >
                {filteredCompanies.map(company => (
                  <li
                    key={company}
                    onMouseDown={() => selectCompany(company)}
                    className="px-4 py-2.5 cursor-pointer text-sm"
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
            <input className={inputCls('job_name')} value={form.job_name} onChange={set('job_name')} placeholder="e.g. Milk Carton, Soap Box" />
            {err('job_name')}
          </div>

          {/* 3. Artworks */}
          <div>
            <label className="form-label">Artworks</label>
            <input className="form-input" value={form.artworks} onChange={set('artworks')} placeholder="e.g. Version A, Final Design" />
          </div>

          {/* 4. Box Size */}
          <div>
            <label className="form-label">
              Box Size (Length × Width × Height in cm)
              <span className="ml-2 text-xs font-normal" style={{ color: '#3d5070' }}>Optional</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input className="form-input" type="number" step="any" value={form.length} onChange={set('length')} placeholder="Length" />
              </div>
              <span className="font-bold text-lg pb-0.5" style={{ color: '#1e2d50' }}>×</span>
              <div className="flex-1">
                <input className="form-input" type="number" step="any" value={form.width} onChange={set('width')} placeholder="Width" />
              </div>
              <span className="font-bold text-lg pb-0.5" style={{ color: '#1e2d50' }}>×</span>
              <div className="flex-1">
                <input className="form-input" type="number" step="any" value={form.height} onChange={set('height')} placeholder="Height" />
              </div>
            </div>
          </div>

          {/* 5 & 6. Paper GSM + Paper Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GSM — typable with autocomplete */}
            <div className="relative">
              <label className="form-label">Paper GSM <span style={{ color: '#f87171' }}>*</span></label>
              <input
                className={inputCls('gsm_input')}
                type="number"
                step="1"
                min="1"
                value={form.gsm_input}
                onChange={e => { set('gsm_input')(e); setShowGsmSuggestions(true); }}
                onFocus={() => setShowGsmSuggestions(true)}
                onBlur={() => setTimeout(() => setShowGsmSuggestions(false), 150)}
                placeholder="e.g. 300, 350"
                autoComplete="off"
              />
              {err('gsm_input')}
              {showGsmSuggestions && filteredGsmValues.length > 0 && (
                <ul
                  className="absolute z-50 left-0 right-0 rounded-lg shadow-xl"
                  style={{ top: 'calc(100% + 4px)', background: '#141c35', border: '1px solid #1e2d50', maxHeight: '160px', overflowY: 'auto' }}
                >
                  {filteredGsmValues.map(v => (
                    <li
                      key={v}
                      onMouseDown={() => selectGsm(String(v))}
                      className="px-4 py-2.5 cursor-pointer text-sm"
                      style={{ color: '#e2e8f0', borderBottom: '1px solid #1e2d50' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(224,64,251,0.1)'; (e.currentTarget as HTMLElement).style.color = '#e040fb'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
                    >
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Paper Quality */}
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
            <input className={inputCls('order_quantity')} type="number" min="1" step="1" value={form.order_quantity} onChange={set('order_quantity')} placeholder="e.g. 10000" />
            {err('order_quantity')}
          </div>

          {/* 8. Sheet Size */}
          <div>
            <label className="form-label">Sheet Size (Length × Width in cm) <span style={{ color: '#f87171' }}>*</span></label>
            <p className="text-xs mb-2" style={{ color: '#3d5070' }}>Paper sheet dimensions, not the box dimensions.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input className={inputCls('sheet_length')} type="number" step="any" value={form.sheet_length} onChange={set('sheet_length')} placeholder="Sheet Length" />
                {err('sheet_length')}
              </div>
              <span className="font-bold text-lg pb-0.5" style={{ color: '#1e2d50' }}>×</span>
              <div className="flex-1">
                <input className={inputCls('sheet_width')} type="number" step="any" value={form.sheet_width} onChange={set('sheet_width')} placeholder="Sheet Width" />
                {err('sheet_width')}
              </div>
            </div>
          </div>

          {/* 9. UPS */}
          <div>
            <label className="form-label">UPS (boxes per sheet) <span style={{ color: '#f87171' }}>*</span></label>
            <input className={inputCls('ups')} type="number" min="1" step="1" value={form.ups} onChange={set('ups')} placeholder="e.g. 4" />
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
          <button type="button" onClick={onClose} className="btn-secondary" disabled={busy}>
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {mode === 'create' && onSavePartial && (
              <button
                type="button"
                onClick={handleSavePartial}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.1)'; }}
                title="Save current data as a draft — no validation required"
              >
                {savingPartial ? 'Saving Draft...' : 'Save as Draft'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary px-8"
              disabled={busy}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving...
                </span>
              ) : primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
