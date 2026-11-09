import { Router } from 'express';
import { env } from '../config/env.js';
import { queryPaths } from '../config/httpSurface.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { mailActionLimiter } from '../middleware/rateLimit.js';
import { lookupCnpj } from '../services/cnpjLookup.js';

export const lookupsRouter = Router();

lookupsRouter.use(requireAuth, loadUser);

function resolveGoogleKey() {
  return env.googlePlacesApiKey || '';
}

async function fetchJson(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function googleHeaders(key, fieldMask) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
    'X-Goog-FieldMask': fieldMask,
  };
}

function componentOf(components, type, short = false) {
  const item = (components || []).find((c) => (c.types || []).includes(type));
  if (!item) return '';
  if (short) return item.shortText || item.short_name || '';
  return item.longText || item.long_name || '';
}

function formatCep(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (d.length !== 8) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function parseGoogleAddress(components) {
  const neighborhood =
    componentOf(components, 'neighborhood') ||
    componentOf(components, 'sublocality_level_1') ||
    componentOf(components, 'sublocality');
  const district =
    [
      componentOf(components, 'sublocality_level_2'),
      componentOf(components, 'administrative_area_level_3'),
      componentOf(components, 'administrative_area_level_4'),
    ].find((part) => part && part !== neighborhood) || '';

  return {
    street: componentOf(components, 'route'),
    number: componentOf(components, 'street_number'),
    complement: '',
    neighborhood,
    district,
    city:
      componentOf(components, 'administrative_area_level_2') ||
      componentOf(components, 'locality'),
    state: componentOf(components, 'administrative_area_level_1', true),
    country: componentOf(components, 'country') || 'Brasil',
    zip: formatCep(componentOf(components, 'postal_code')),
  };
}

function buildFormatted(parts) {
  const street = [parts.street, parts.number].filter(Boolean).join(', ');
  return [...new Set([street, parts.neighborhood, parts.district, parts.city, parts.state, parts.country].filter(Boolean))].join(', ');
}

lookupsRouter.get(queryPaths.address, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.json({ data: [] });

    const key = resolveGoogleKey();
    if (!key) {
      return res.status(503).json({
        error: { message: 'Busca de endereço indisponível' },
      });
    }

    const { ok, data } = await fetchJson('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: googleHeaders(
        key,
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      ),
      body: JSON.stringify({
        input: q,
        languageCode: 'pt-BR',
        includedRegionCodes: ['br'],
      }),
    });

    if (!ok) {
      return res.status(400).json({
        error: { message: 'Falha na busca de endereço' },
      });
    }

    const items = (data?.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({
        placeId: p.placeId,
        label: p.text?.text || '',
      }))
      .filter((p) => p.placeId && p.label);

    return res.json({ data: items });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: { message: 'A busca de endereço excedeu o tempo limite' } });
    }
    return next(err);
  }
});

lookupsRouter.get(queryPaths.place, async (req, res, next) => {
  try {
    const placeId = String(req.params.placeId || '')
      .replace(/^places\//, '')
      .trim();
    if (!placeId) {
      return res.status(400).json({ error: { message: 'Endereço inválido' } });
    }

    const key = resolveGoogleKey();
    if (!key) {
      return res.status(503).json({
        error: { message: 'Busca de endereço indisponível' },
      });
    }

    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set('languageCode', 'pt-BR');

    const { ok, data } = await fetchJson(url, {
      headers: googleHeaders(key, 'addressComponents,formattedAddress,displayName'),
    });

    if (!ok || !data) {
      return res.status(404).json({
        error: { message: 'Não foi possível obter o endereço' },
      });
    }

    const parsed = parseGoogleAddress(data.addressComponents);
    if (!parsed.street) {
      parsed.street = data.formattedAddress || data.displayName?.text || '';
    }
    parsed.placeId = placeId;
    parsed.formatted =
      data.formattedAddress || buildFormatted(parsed) || data.displayName?.text || parsed.street;

    return res.json({ data: parsed });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: { message: 'A busca de endereço excedeu o tempo limite' } });
    }
    return next(err);
  }
});

lookupsRouter.get(queryPaths.cnpj, mailActionLimiter, async (req, res, next) => {
  try {
    const data = await lookupCnpj(req.params.cnpj);
    return res.json({ data });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: { message: 'A consulta do CNPJ excedeu o tempo limite' } });
    }
    if (err.status) {
      return res.status(err.status).json({ error: { message: err.message } });
    }
    return next(err);
  }
});
