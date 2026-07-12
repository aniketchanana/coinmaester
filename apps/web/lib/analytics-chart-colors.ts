/** Semantic colors for Debit / Credit / Investment series. */
export const ANALYTICS_SERIES_COLORS = {
  debit: '#f43f5e', // rose-500
  credit: '#10b981', // emerald-500
  investment: '#8b5cf6', // violet-500
} as const;

/** Categorical palette for comparing multiple presets. */
export const ANALYTICS_PRESET_COLORS = [
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#6366f1', // indigo-500
] as const;

export function presetColorAt(index: number): string {
  return ANALYTICS_PRESET_COLORS[index % ANALYTICS_PRESET_COLORS.length]!;
}
