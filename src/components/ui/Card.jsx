/**
 * Archivio Premium Card Components
 * Reusable card system with glassmorphism + micro-animations
 */

import React from 'react';

// ── Base Card ────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = true, glass = false, onClick }) {
  const base = [
    'relative rounded-2xl border transition-all duration-300 overflow-hidden',
    glass
      ? 'bg-white/60 dark:bg-stone-900/60 backdrop-blur-sm border-white/40 dark:border-stone-700/50'
      : 'bg-white dark:bg-stone-900 border-stone-200/70 dark:border-stone-800',
    hover ? 'hover:shadow-xl hover:-translate-y-[2px] shadow-sm' : 'shadow-sm',
    onClick ? 'cursor-pointer' : '',
    className,
  ].join(' ');
  return <div className={base} onClick={onClick}>{children}</div>;
}

// ── Card Header ──────────────────────────────────────────────────────────────
export function CardHeader({ children, className = '', accent = false }) {
  return (
    <div className={[
      'px-6 py-4 flex items-center justify-between',
      'border-b border-stone-100 dark:border-stone-800',
      accent
        ? 'bg-gradient-to-r from-[#7B1F35]/5 to-transparent dark:from-[#7B1F35]/10'
        : 'bg-gradient-to-r from-stone-50/80 to-white dark:from-stone-800/60 dark:to-stone-900',
      className,
    ].join(' ')}>
      {children}
    </div>
  );
}

// ── Card Body ────────────────────────────────────────────────────────────────
export function CardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

// ── Card Footer ──────────────────────────────────────────────────────────────
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color = 'maroon', trend, className = '' }) {
  const colorMap = {
    maroon: { bg: 'bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20', text: 'text-[#7B1F35] dark:text-[#D05353]', bar: 'bg-[#7B1F35]' },
    green:  { bg: 'bg-green-100 dark:bg-green-900/30',     text: 'text-green-700 dark:text-green-400',  bar: 'bg-green-500' },
    amber:  { bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',  bar: 'bg-amber-500' },
    blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-400',    bar: 'bg-blue-500' },
    red:    { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-600 dark:text-red-400',      bar: 'bg-red-500' },
  };
  const c = colorMap[color] || colorMap.maroon;
  return (
    <Card className={`group ${className}`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${c.bar}`} />
      <CardBody className="pt-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-2">{label}</p>
            <p className={`text-[36px] font-bold font-serif leading-none ${c.text}`}>{value}</p>
            {sub && <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-1.5">{sub}</p>}
            {trend !== undefined && (
              <p className={`text-[12px] font-semibold mt-2 ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this month
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 text-xl`}>
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    published:   { label: '✓ Published',       cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
    approved:    { label: '✓ Approved',         cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
    reviewed:    { label: '✓ Reviewed',         cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
    uploaded:    { label: '✓ Uploaded',         cls: 'bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20 text-[#7B1F35] dark:text-[#D05353] border-[#7B1F35]/20' },
    submitted:   { label: '✓ Submitted',        cls: 'bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20 text-[#7B1F35] dark:text-[#D05353] border-[#7B1F35]/20' },
    pending:     { label: '⏳ Pending',          cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    missing:     { label: '✗ Missing',          cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
    revision:    { label: '⚠ Revision Req.',   cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
    in_progress: { label: '● In Progress',     cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  };
  const s = map[status] || { label: status, cls: 'bg-stone-100 text-stone-600 border-stone-200' };
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-3 py-1.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, sub, action }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] dark:text-stone-100 leading-tight">{children}</h2>
        {sub && <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-0.5">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Premium Button ────────────────────────────────────────────────────────────
export function PremiumButton({ children, onClick, variant = 'primary', size = 'md', icon, disabled, className = '' }) {
  const sizes = { sm: 'px-4 py-2 text-[12px]', md: 'px-6 py-2.5 text-[13px]', lg: 'px-8 py-3 text-[15px]' };
  const variants = {
    primary: 'bg-[#7B1F35] hover:bg-[#63182a] text-white shadow-md hover:shadow-lg active:scale-95',
    ghost:   'border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800 text-[#1A1A1A] dark:text-stone-300',
    danger:  'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg active:scale-95',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg active:scale-95',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 font-bold rounded-full transition-all duration-200',
        sizes[size], variants[variant],
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        className,
      ].join(' ')}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
