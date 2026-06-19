'use client';
import { useState, useEffect, useCallback } from 'react';
import { PartialEntry, PartialEntryCreate, CalcResult } from '@/types';
import { calculateJob } from '@/lib/calculations';
import { gsmApi } from '@/lib/api';
import CalculationPreview from './CalculationPreview';

const QUALITY_BASE = ['FBB ITC', 'Saffire XL', 'Grey Back', 'White Back'];
const QUALITY_OPTIONS = [...QUALITY_BASE, 'Other'];

interface Props {
  editPartial: PartialEntry | null;
  onSave: (data: PartialEntryCreate) => Promise<void>;
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
  notes: string;
}

const emptyForm = (): FormState => ({
  customer_name: '', job_name: '', artworks: '',
  length: '', width: '', height: '',
  gsm_input: '', paper_quality: '', custom_quality: '',
  order_quantity: '', sheet_length: '', sheet_width: '', ups: '',
  notes: '',
});

export default function PartialEntryEditForm({ editPartial, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [gsmValues, setGsmValues] = useState<number[]>([]);
  const [showGsmSuggestions, setShowGsmSuggestions] = useState(false);

  useEffect(() => {
    gsmApi.values().then(res => setGsmValues(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editPartial) { setForm(emptyForm()); return; }
    const pq = editPartial.paper_quality ?? '';
    const isCustom = pq ? !QUALITY_BASE.includes(pq) : false;
    setForm({
      customer_name: editPartial.customer_name ?? '',
      job_name: editPartial.job_name ?? '',
      artworks: editPartial.artworks ?? '',
      length: editPartial.length != null ? String(editPartial.length) : '',
      width: editPartial.width != null ? String(editPartial.width) : '',
      height: editPartial.height != null ? String(editPartial.height) : '',
      gsm_input: editPartial.gsm != null ? String(editPartial.gsm) : '',
      paper_quality: pq ? (isCustom ? 'Other' : pq) : '',
      custom_quality: isCustom ? pq : '',
      order_quantity: editPartial.order_quantity != null ? String(editPartial.order_quantity) : '',
      sheet_length: editPartial.sheet_length != null ? String(editPartial.sheet_length) : '',
      sheet_width: editPartial.sheet_width != null ? String(editPartial.sheet_width) : '',
      ups: editPartial.ups != null ? String(editPartial.ups) : '',
      notes: editPartial.notes ?? '',
    });
  }, [editPartial]);

  useEffect(() => {
    setCalc(calculateJob(
      Number(form.order_quantity), Number(form.ups),
      Number(form.sheet_length), Number(form.sheet_width), Number(form.gsm_input),
    ));
  }, [form.order_quantity, form.ups, form.sheet_length, form.sheet_width, form.gsm_input]);

  const set = useCallback((field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value })), []);

  const filteredGsmValues = form.gsm_input.trim()
    ? gsmValues.filter(v => String(v).includes(form.gsm_input.trim()))
    : gsmValues;

  const selectGsm = (val: string) => {
    setForm(prev => ({ ...prev, gsm_input: val }));
    setShowGsmSuggestions(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const qualityVal = form.paper_quality === 'Other'
        ? (form.custom_quality.trim() || null)
        : (form.paper_quality || null);
      await onSave({
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
        notes: form.notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

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
            <h2 className="text-lg font-bold" style={{ color: '#fbbf24' }}>
              Edit Draft Entry
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#3d5070' }}>
              All fields are optional — save any amount of information.
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
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Customer */}
          <div>
            <label className="form-label">Customer / Company Name</label>
            <input className="form-input" value={form.customer_name} onChange={set('customer_name')} placeholder="e.g. Amul, Patanjali" />
          </div>

          {/* Job Name */}
          <div>
            <label className="form-label">Job Name</label>
            <input className="form-input" value={form.job_name} onChange={set('job_name')} placeholder="e.g. Milk Carton, Soap Box" />
          </div>

          {/* Artworks */}
          <div>
            <label className="form-label">Artworks</label>
            <input className="form-input" value={form.artworks} onChange={set('artworks')} placeholder="e.g. Version A, Final Design" />
          </div>

          {/* Box Size */}
          <div>
            <label className="form-label">Box Size (L × W × H in cm)</label>
            <div className="flex items-center gap-2">
              <input className="form-input flex-1" type="number" step="any" value={form.length} onChange={set('length')} placeholder="Length" />
              <span className="font-bold" style={{ color: '#1e2d50' }}>×</span>
              <input className="form-input flex-1" type="number" step="any" value={form.width} onChange={set('width')} placeholder="Width" />
              <span className="font-bold" style={{ color: '#1e2d50' }}>×</span>
              <input className="form-input flex-1" type="number" step="any" value={form.height} onChange={set('height')} placeholder="Height" />
            </div>
          </div>

          {/* GSM + Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="form-label">Paper GSM</label>
              <input
                className="form-input"
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
              {showGsmSuggestions && filteredGsmValues.length > 0 && (
                <ul
                  className="absolute z-50 left-0 right-0 rounded-lg shadow-xl"
                  style={{ top: 'calc(100% + 4px)', background: '#141c35', border: '1px solid #1e2d50', maxHeight: '140px', overflowY: 'auto' }}
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
            <div>
              <label className="form-label">Paper Quality</label>
              <select className="form-input" value={form.paper_quality} onChange={set('paper_quality')}>
                <option value="">— Select —</option>
                {QUALITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {form.paper_quality === 'Other' && (
                <input
                  className="form-input mt-2"
                  value={form.custom_quality}
                  onChange={set('custom_quality')}
                  placeholder="Enter paper quality"
                />
              )}
            </div>
          </div>

          {/* Order Quantity */}
          <div>
            <label className="form-label">Order Quantity</label>
            <input className="form-input" type="number" min="1" step="1" value={form.order_quantity} onChange={set('order_quantity')} placeholder="e.g. 10000" />
          </div>

          {/* Sheet Size */}
          <div>
            <label className="form-label">Sheet Size (Length × Width in cm)</label>
            <div className="flex items-center gap-2">
              <input className="form-input flex-1" type="number" step="any" value={form.sheet_length} onChange={set('sheet_length')} placeholder="Sheet Length" />
              <span className="font-bold" style={{ color: '#1e2d50' }}>×</span>
              <input className="form-input flex-1" type="number" step="any" value={form.sheet_width} onChange={set('sheet_width')} placeholder="Sheet Width" />
            </div>
          </div>

          {/* UPS */}
          <div>
            <label className="form-label">UPS (boxes per sheet)</label>
            <input className="form-input" type="number" min="1" step="1" value={form.ups} onChange={set('ups')} placeholder="e.g. 4" />
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input resize-none"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any notes about this draft entry..."
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {/* Calc Preview (only when enough data) */}
          <CalculationPreview result={calc} />
        </div>

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
            onClick={handleSave}
            className="btn-primary px-8"
            disabled={saving}
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
