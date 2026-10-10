export function parseDate(isoString: string): Date {
  // Treat as local clinic time without timezone skew
  const [datePart, timePart] = isoString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function formatDate(isoString: string): string {
  const d = parseDate(isoString);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(isoString: string): string {
  const [, timePart] = isoString.split('T');
  return timePart;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const isOvernight = isCrossMidnight(startIso, endIso);
  const startTime = formatTime(startIso);
  const endTime = formatTime(endIso);
  return isOvernight ? `${startTime} – ${endTime} (+1 day)` : `${startTime} – ${endTime}`;
}

export function isCrossMidnight(startIso: string, endIso: string): boolean {
  const [startDate] = startIso.split('T');
  const [endDate] = endIso.split('T');
  return startDate !== endDate;
}

export function getDurationHours(startIso: string, endIso: string): number {
  const d1 = parseDate(startIso);
  const d2 = parseDate(endIso);
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
}

export function formatDuration(hours: number): string {
  return Number.isInteger(hours) ? `${hours} hrs` : `${hours.toFixed(1)} hrs`;
}
