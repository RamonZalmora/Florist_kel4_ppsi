let csrf = '';
export function setCsrf(token) {
  csrf = token || '';
}
export async function api(path, options = {}) {
  const response = await fetch('/api' + path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.method && options.method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({ error: 'Respons server tidak valid.' }));
  if (!response.ok) {
    const error = new Error(
      data.details?.length
        ? data.error + ' ' + data.details.join('; ')
        : data.error || 'Permintaan gagal.',
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
export const money = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
export const date = (d) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(d));
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const orderCode = (id) => 'BV-' + String(id).padStart(4, '0');
