import { PropertyConfig } from '../types/hospitality';

export function formatMoney(amount: number, config: Pick<PropertyConfig, 'currencyCode' | 'currencySymbol'>): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));

  const prefix = safe < 0 ? '-' : '';
  if (config.currencyCode === 'ETB') {
    return `${prefix}ETB ${formatted}`;
  }
  return `${prefix}${config.currencySymbol}${formatted}`;
}

export function formatCompactMoney(amount: number, config: Pick<PropertyConfig, 'currencyCode' | 'currencySymbol'>): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (Math.abs(safe) >= 1000) {
    const k = (safe / 1000).toFixed(1).replace(/\.0$/, '');
    return config.currencyCode === 'ETB' ? `${k}K ETB` : `${config.currencySymbol}${k}K`;
  }
  return formatMoney(safe, config);
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function minutesElapsed(iso: string, nowMs: number = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((nowMs - t) / 60000));
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
