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
  printing_type: string;
  outer_ups: string;
  inner_ups: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  customer_name: '', job_name: '', artworks: '',
  length: '', width: '', height: '',
  gsm_input: '', paper_quality: '', custom_quality: '',
  order_quantity: '', sheet_length: '', sheet_width: '',
  printing_type: 'outer', outer_ups: '', inner_ups: '',
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
      printing_type: editPartial.printing_type || 'outer',
      outer_ups: editPartial.outer_ups != null ? String(editPartial.outer_ups)
        : (editPartial.ups != null ? String(editPartial.ups) : ''),
      inner_ups: editPartial.inner_ups != null ? String(editPartial.inner_ups) : '',
      notes: editPartial.notes ?? '',
    });
  }, [editPartial]);

  const computedTotalUps: number = (() => {
    const o = Number(form.outer_ups) || 0;
    const i = Number(form.inner_ups) || 0;
    if (form.printing_type === 'inner') return i;
    if (form.printing_type === 'both') return o + i;
    return o;
  })();

  useEffect(() => {
    setCalc(calculateJob(
      Number(form.order_quantity), computedTotalUps,
      Number(form.sheet_length), Number(form.sheet_width), Number(form.gsm_input),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.order_quantity, form.printing_type, form.outer_ups, form.inner_ups, form.sheet_length, form.sheet_width, form.gsm_input]);

  const set = useCallback((field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value })), []);

  const setPrintingType = (pt: string) => {
    setForm(prev => ({ ...prev, printing_type: pt }));
  };

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
        printing_type: form.printing_type || null,
        outer_ups: form.outer_ups ? Number(form.outer_ups) || null : null,
        inner_ups: form.inner_ups ? Number(form.inner_ups) || null : null,
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

          {/* 1. Customer */}
          <div>
            <label className="form-label">Customer / Company Name</label>
            <input className="form-input" value={form.customer_name} onChange={set('customer_name')} placeholder="e.g. Amul, Patanjali" />
          </div>

          {/* 2. Job Name */}
          <div>
            <label className="form-label">Job Name</label>
            <input className="form-input" value={form.job_name} onChange={set('job_name')} placeholder="e.g. Milk Carton, Soap Box" />
          </div>

          {/* 3. Artworks */}
          <div>
            <label className="form-label">Artworks</label>
            <input className="form-input" value={form.artworks} onChange={set('artworks')} placeholder="e.g. Version A, Final Design" />
          </div>

          {/* 4. Order Quantity */}
          <div>
            <label className="form-label">Order Quantity</label>
            <input className="form-input" type="number" min="1" step="1" value={form.order_quantity} onChange={set('order_quantity')} placeholder="e.g. 10000" />
          </div>

          {/* 5. Sheet Size */}
          <div>
            <label className="form-label">Sheet Size (Length × Width in cm)</label>
            <div className="flex items-center gap-2">
              <input className="form-input flex-1" type="number" step="any" value={form.sheet_length} onChange={set('sheet_length')} placeholder="Sheet Length" />
              <span className="font-bold" style={{ color: '#1e2d50' }}>×</span>
              <input className="form-input flex-1" type="number" step="any" value={form.sheet_width} onChange={set('sheet_width')} placeholder="Sheet Width" />
            </div>
          </div>

          {/* 6. Paper GSM */}
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

          {/* 7. Printing Type + UPS */}
          <div>
            <label className="form-label">Printing Type</label>
            <div className="flex gap-2 mt-1">
              {(['outer', 'inner', 'both'] as const).map(pt => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPrintingType(pt)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
                  style={form.printing_type === pt
                    ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }
                    : { background: '#141c35', color: '#3d5070', border: '1px solid #1e2d50' }
                  }
                >
                  {pt === 'outer' ? 'Outer' : pt === 'inner' ? 'Inner' : 'Both'}
                </button>
              ))}
            </div>
          </div>

          {(form.printing_type === 'outer' || form.printing_type === 'both') && (
            <div>
              <label className="form-label">
                Outer UPS
                <span className="ml-1.5 text-xs font-normal" style={{ color: '#3d5070' }}>boxes per sheet (outer)</span>
              </label>
              <input className="form-input" type="number" min="1" step="1" value={form.outer_ups} onChange={set('outer_ups')} placeholder="e.g. 4" />
            </div>
          )}

          {(form.printing_type === 'inner' || form.printing_type === 'both') && (
            <div>
              <label className="form-label">
                Inner UPS
                <span className="ml-1.5 text-xs font-normal" style={{ color: '#3d5070' }}>boxes per sheet (inner)</span>
              </label>
              <input className="form-input" type="number" min="1" step="1" value={form.inner_ups} onChange={set('inner_ups')} placeholder="e.g. 2" />
            </div>
          )}

          {form.printing_type === 'both' && Number(form.outer_ups) > 0 && Number(form.inner_ups) > 0 && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              <span className="text-sm font-medium" style={{ color: '#64748b' }}>Total UPS</span>
              <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                {Number(form.outer_ups) + Number(form.inner_ups)}
                <span className="ml-1.5 text-xs font-normal" style={{ color: '#3d5070' }}>
                  ({form.outer_ups} outer + {form.inner_ups} inner)
                </span>
              </span>
            </div>
          )}

          {/* 8. Paper Quality */}
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

          {/* 9. Box Size (Optional — always last) */}
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
