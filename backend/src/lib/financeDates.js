export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function toDateOnly(value) {
  if (!value) return todayDateOnly();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function parseDateOnly(value) {
  const [y, m, d] = String(toDateOnly(value)).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function dateWithDay(year, month, day) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safe = Math.min(Number(day), last);
  return new Date(Date.UTC(year, month - 1, safe));
}

export function addMonthsSafe(dateOnly, months) {
  const d = parseDateOnly(dateOnly);
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatDateOnly(d);
}

export function addDaysSafe(dateOnly, days) {
  const d = parseDateOnly(dateOnly);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnly(d);
}

export function shiftMonth(year, month, delta) {
  const idx = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(idx / 12),
    month: (idx % 12) + 1,
  };
}

export function monthLabel(year, month) {
  return `${String(month).padStart(2, '0')}/${year}`;
}

export function formatBr(dateOnly) {
  const [y, m, d] = String(dateOnly).split('-');
  return `${d}/${m}/${y}`;
}
