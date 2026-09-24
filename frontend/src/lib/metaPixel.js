// Meta Pixel + atribución (UTMs / fbclid) para Simulia.
// El píxel solo se carga si la usuaria acepta cookies (ver App.js → loadAnalytics).
// Todas las funciones son seguras si fbq no existe: simplemente no hacen nada.

export const META_PIXEL_ID = '1080688154610872'; // Conjunto de datos "Simulia Web"

const ATTR_KEY = 'simulia_attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function track(eventName, params = {}, eventId) {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return false;
    if (eventId) {
      window.fbq('track', eventName, params, { eventID: String(eventId) });
    } else {
      window.fbq('track', eventName, params);
    }
    return true;
  } catch (_) {
    return false;
  }
}

// ViewContent de la página de planes, una sola vez por navegación (routeKey = location.key del router)
export function trackPricingView(routeKey) {
  if (routeKey === undefined || window.__simuliaVCKey === routeKey) return;
  if (track('ViewContent', { content_name: 'Planes', content_category: 'pricing' })) {
    window.__simuliaVCKey = routeKey;
  }
}

function readCookie(name) {
  try {
    const row = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
    return row ? decodeURIComponent(row.split('=').slice(1).join('=')) : undefined;
  } catch (_) {
    return undefined;
  }
}

// Guarda UTMs y fbclid del aterrizaje (last-touch: una visita nueva con UTMs sobrescribe).
// No es una cookie de seguimiento: es un dato propio que solo se envía a nuestro backend
// cuando la usuaria completa el checkout.
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const hasUtm = UTM_KEYS.some((k) => params.get(k));
    const fbclid = params.get('fbclid');
    if (!hasUtm && !fbclid) return;
    const data = { capturedAt: new Date().toISOString(), landingPage: window.location.pathname };
    UTM_KEYS.forEach((k) => {
      if (params.get(k)) data[k] = params.get(k);
    });
    if (fbclid) {
      data.fbclid = fbclid;
      data.fbcFromClick = `fb.1.${Date.now()}.${fbclid}`;
    }
    localStorage.setItem(ATTR_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function getAttribution() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(ATTR_KEY) || '{}') || {};
  } catch (_) {}
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc') || stored.fbcFromClick;
  const { fbcFromClick, ...rest } = stored;
  return {
    ...rest,
    ...(fbp && { fbp }),
    ...(fbc && { fbc }),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  };
}
