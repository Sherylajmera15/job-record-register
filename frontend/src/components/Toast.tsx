'use client';
import { useEffect } from 'react';
import { ToastMsg } from '@/types';

interface Props {
  toasts: ToastMsg[];
  onRemove: (id: string) => void;
}

const icons = { success: '✓', error: '✕', info: 'ℹ' };
const styles = {
  success: { background: 'linear-gradient(135deg, #0d2a1a, #0a1f14)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' },
  error:   { background: 'linear-gradient(135deg, #2a0d0d, #1f0a0a)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171' },
  info:    { background: 'linear-gradient(135deg, #0d1a2a, #0a141f)', border: '1px solid rgba(0,204,240,0.35)', color: '#00ccf0' },
};

export default function Toast({ toasts, onRemove }: Props) {
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => onRemove(t.id), 4500));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onRemove]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium min-w-72 max-w-sm animate-[fadeSlideIn_0.25s_ease]"
          style={styles[t.kind]}
        >
          <span className="text-base mt-0.5 shrink-0">{icons[t.kind]}</span>
          <span className="flex-1 leading-relaxed text-white">{t.text}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="shrink-0 transition-opacity text-base leading-none opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
