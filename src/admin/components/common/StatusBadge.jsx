import React from 'react';

const STATUS_CONFIGS = {
  // Account Statuses
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-amber-500 animate-pulse',
    classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  pending_activation: {
    label: 'Pending Activation',
    dot: 'bg-amber-500 animate-pulse',
    classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  inactive: {
    label: 'Inactive',
    dot: 'bg-red-500',
    classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  },
  deactivated: {
    label: 'Deactivated',
    dot: 'bg-red-500',
    classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  },

  // Log / Action Statuses
  success: {
    label: 'Success',
    dot: 'bg-emerald-500',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-500',
    classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  },

  // Roles
  'super-admin': {
    label: 'Super Admin',
    dot: 'bg-red-600',
    classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  },
  'system admin': {
    label: 'System Admin',
    dot: 'bg-[#770000]',
    classes: 'bg-[#770000]/10 text-[#770000] border-[#770000]/20 dark:bg-[#770000]/20 dark:text-[#ff8ca3] dark:border-[#770000]/40',
  },
  dean: {
    label: 'Dean',
    dot: 'bg-pink-600',
    classes: 'bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  },
  'dean+adviser': {
    label: 'Dean + Adviser',
    dot: 'bg-purple-600',
    classes: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  },
  adviser: {
    label: 'Adviser',
    dot: 'bg-amber-600',
    classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  student: {
    label: 'Student',
    dot: 'bg-blue-600',
    classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  }
};

export default function StatusBadge({ status = 'active', customLabel, size = 'md' }) {
  const normalizedKey = (status || '').toLowerCase().trim();
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: status || 'Unknown',
    dot: 'bg-stone-400',
    classes: 'bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700'
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5' 
    : 'text-[11px] px-2.5 py-1';

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeClasses} ${config.classes} shadow-xs select-none`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
      <span>{customLabel || config.label}</span>
    </span>
  );
}
