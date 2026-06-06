'use client';
import { DualDashboardStats, DashboardStats } from '@/types';

interface Props {
  stats: DualDashboardStats | null;
  loading: boolean;
}

interface CardDef {
  key: keyof DashboardStats;
  label: string;
  accent: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  format: (v: number) => string;
}

const cards: CardDef[] = [
  {
    key: 'total_jobs',
    label: 'Total Jobs',
    accent: '#00ccf0',
    bg: 'linear-gradient(135deg, #0d1228, #0f1e3a)',
    border: 'rgba(0, 204, 240, 0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    format: (v: number) => v.toLocaleString('en-IN'),
  },
  {
    key: 'total_sheets',
    label: 'Total Sheets',
    accent: '#e040fb',
    bg: 'linear-gradient(135deg, #0d1228, #1a0f2e)',
    border: 'rgba(224, 64, 251, 0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    format: (v: number) => v.toLocaleString('en-IN'),
  },
  {
    key: 'total_kg',
    label: 'Total KG Ordered',
    accent: '#a78bfa',
    bg: 'linear-gradient(135deg, #0d1228, #150f2e)',
    border: 'rgba(167, 139, 250, 0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    format: (v: number) => `${v.toLocaleString('en-IN')} kg`,
  },
  {
    key: 'jobs_this_month',
    label: 'Jobs This Month',
    accent: '#34d399',
    bg: 'linear-gradient(135deg, #0d1228, #0a1e1a)',
    border: 'rgba(52, 211, 153, 0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    format: (v: number) => v.toLocaleString('en-IN'),
  },
];

function StatCard({ card, value, loading }: { card: CardDef; value: number | undefined; loading: boolean }) {
  const display = value !== undefined ? card.format(value) : '—';
  return (
    <div
      className="rounded-2xl p-5 shadow-lg"
      style={{ background: card.bg, border: `1px solid ${card.border}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {card.label}
        </span>
        <span style={{ color: card.accent, opacity: 0.8 }}>{card.icon}</span>
      </div>
      <div
        className={`text-3xl font-extrabold tracking-tight ${loading ? 'opacity-30' : ''}`}
        style={{ color: card.accent }}
      >
        {loading ? '...' : display}
      </div>
    </div>
  );
}

function SectionLabel({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{
          color: accent,
          background: `${accent}18`,
          border: `1px solid ${accent}40`,
          letterSpacing: '0.12em',
        }}
      >
        {title}
      </span>
      <div className="flex-1 h-px" style={{ background: `${accent}20` }} />
    </div>
  );
}

// Overall section shows only Total Jobs, Total Sheets, Total KG (no Jobs This Month)
const overallCards = cards.filter(c => c.key !== 'jobs_this_month');

export default function Dashboard({ stats, loading }: Props) {
  return (
    <div className="space-y-6 mb-8">
      {/* THIS MONTH — all 4 cards */}
      <div>
        <SectionLabel title="This Month" accent="#00ccf0" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <StatCard
              key={`month-${card.key}`}
              card={card}
              value={stats?.month[card.key]}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* OVERALL — 3 cards only (Jobs This Month excluded) */}
      <div>
        <SectionLabel title="Overall" accent="#e040fb" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {overallCards.map(card => (
            <StatCard
              key={`overall-${card.key}`}
              card={card}
              value={stats?.overall[card.key]}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
