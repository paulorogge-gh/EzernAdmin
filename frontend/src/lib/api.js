import { API } from './httpSurface';
import { emitSessionExpired } from './session';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshSession() {
  const res = await fetch(API.refresh, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    accessToken = null;
    throw new Error('Sessão expirada');
  }
  const body = await res.json();
  accessToken = body.data.accessToken;
  return body.data;
}

/**
 * @param {string} url caminho absoluto opaco (ex.: API.members)
 */
export async function api(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const skipRefresh = url === API.login || url === API.refresh;
  if (res.status === 401 && !skipRefresh) {
    try {
      await refreshSession();
      headers.set('Authorization', `Bearer ${accessToken}`);
      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch {
      setAccessToken(null);
      emitSessionExpired();
      throw new Error('Sessão expirada');
    }
  }

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      setAccessToken(null);
      emitSessionExpired();
    }
    throw new Error(body?.error?.message || 'Falha na requisição');
  }
  if (body?.data?.accessToken) {
    accessToken = body.data.accessToken;
  }
  return body.data;
}

/** Upload multipart (FormData). Não define Content-Type manualmente. */
export async function apiUpload(url, formData, options = {}) {
  return api(url, {
    ...options,
    method: options.method || 'POST',
    body: formData,
  });
}

/** Download autenticado como Blob (anexos). */
export async function apiDownload(url) {
  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let res = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    try {
      await refreshSession();
      headers.set('Authorization', `Bearer ${accessToken}`);
      res = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
    } catch {
      setAccessToken(null);
      emitSessionExpired();
      throw new Error('Sessão expirada');
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      setAccessToken(null);
      emitSessionExpired();
    }
    let message = 'Falha no download';
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // resposta binária ou vazia
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="([^"]+)"/i);
  const filename = utfMatch
    ? decodeURIComponent(utfMatch[1])
    : plainMatch
      ? plainMatch[1]
      : 'arquivo';

  return { blob, filename, contentType: res.headers.get('Content-Type') || blob.type };
}

export function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'arquivo';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
