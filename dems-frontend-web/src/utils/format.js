export function shortAddress(value = '') {
  if (!value) return 'not connected';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function compactHash(value = '', start = 12, end = 8) {
  if (!value) return 'pending';
  return value.length > start + end ? `${value.slice(0, start)}...${value.slice(-end)}` : value;
}

export function formatDate(value) {
  if (!value) return 'pending';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
