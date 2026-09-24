// API de Conversiones de Meta (servidor → Meta).
// Variables de entorno (en Koyeb):
//   META_PIXEL_ID          → 1080688154610872 (conjunto de datos "Simulia Web")
//   META_CAPI_TOKEN        → token generado en Administrador de eventos → Configuración → API de conversiones
//   META_TEST_EVENT_CODE   → (opcional) código de prueba, SOLO mientras se prueba; quitarlo después
// Si falta el token, no se envía nada y no rompe el flujo.

const crypto = require('crypto');
const axios = require('axios');

const GRAPH_VERSION = 'v21.0';

const sha256 = (value) =>
  value ? crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex') : undefined;

const isConfigured = () => Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);

/**
 * Envía un evento a Meta.
 * @param {object} p
 * @param {string} p.eventName  Purchase | StartTrial | ...
 * @param {string} p.eventId    id único (deduplicación con el píxel)
 * @param {number} [p.eventTime] epoch en segundos
 * @param {string} [p.email]
 * @param {string} [p.externalId] uid de Firebase
 * @param {object} [p.attribution] { fbp, fbc, userAgent, eventSourceUrl, ip }
 * @param {object} [p.customData] { value, currency, ... }
 */
async function sendMetaEvent({ eventName, eventId, eventTime, email, externalId, attribution = {}, customData = {} }) {
  if (!isConfigured()) {
    console.log(`ℹ️ META CAPI: sin configurar, se omite ${eventName}`);
    return { skipped: true };
  }

  const userData = {
    ...(email && { em: [sha256(email)] }),
    ...(externalId && { external_id: [sha256(externalId)] }),
    ...(attribution.fbp && { fbp: attribution.fbp }),
    ...(attribution.fbc && { fbc: attribution.fbc }),
    ...(attribution.userAgent && { client_user_agent: attribution.userAgent }),
    ...(attribution.ip && { client_ip_address: attribution.ip }),
    country: [sha256('es')],
  };

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime || Math.floor(Date.now() / 1000),
        event_id: eventId ? String(eventId) : undefined,
        action_source: 'website',
        event_source_url: attribution.eventSourceUrl || 'https://www.simulia.es/',
        user_data: userData,
        custom_data: customData,
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE && { test_event_code: process.env.META_TEST_EVENT_CODE }),
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.META_PIXEL_ID}/events`;
    const { data } = await axios.post(url, payload, {
      params: { access_token: process.env.META_CAPI_TOKEN },
      timeout: 8000,
    });
    console.log(`✅ META CAPI: ${eventName} enviado (event_id=${eventId})`, data?.events_received);
    return { ok: true, data };
  } catch (err) {
    console.error(`❌ META CAPI: error enviando ${eventName}:`, err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}

module.exports = { sendMetaEvent, sha256, isConfigured };
