import React from 'react';
import { Helmet } from "react-helmet";
import { Link } from 'react-router-dom';

export default function PoliticaCookies() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <Helmet>
        <title>Política de Cookies | Simulia</title>
        <meta name="description" content="Política de cookies de Simulia. Información sobre las cookies que utilizamos, su finalidad y cómo gestionarlas." />
      </Helmet>
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <Link to="/" className="text-primary hover:underline text-sm mb-6 inline-block">← Volver a Simulia</Link>
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Política de Cookies</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <p>
            En cumplimiento del artículo 22.2 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
            Información y de Comercio Electrónico (LSSI-CE), y conforme a las directrices de la Agencia Española de
            Protección de Datos (AEPD) de julio de 2023, te informamos sobre las cookies que utiliza este sitio web.
          </p>

          <div>
            <h2 className="text-2xl font-semibold mb-2">¿Qué son las cookies?</h2>
            <p>
              Las cookies son pequeños archivos de texto que se almacenan en tu navegador cuando visitas un sitio web.
              Permiten que la web recuerde información sobre tu visita, como tu idioma preferido y otras configuraciones,
              lo que facilita tu próxima visita y hace que el sitio sea más útil para ti.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Cookies que utilizamos</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Cookie</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Finalidad</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-xs">CookieConsent</td>
                    <td className="border border-gray-300 px-4 py-2">Técnica</td>
                    <td className="border border-gray-300 px-4 py-2">Almacena tu preferencia sobre el uso de cookies</td>
                    <td className="border border-gray-300 px-4 py-2">1 año</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-xs">Firebase Auth</td>
                    <td className="border border-gray-300 px-4 py-2">Técnica</td>
                    <td className="border border-gray-300 px-4 py-2">Gestión de sesión de usuario autenticado</td>
                    <td className="border border-gray-300 px-4 py-2">Sesión</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-xs">__stripe_mid / __stripe_sid</td>
                    <td className="border border-gray-300 px-4 py-2">Técnica</td>
                    <td className="border border-gray-300 px-4 py-2">Procesamiento seguro de pagos mediante Stripe</td>
                    <td className="border border-gray-300 px-4 py-2">Sesión / 30 min</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-xs">_ga / _ga_*</td>
                    <td className="border border-gray-300 px-4 py-2">Analítica</td>
                    <td className="border border-gray-300 px-4 py-2">Google Analytics 4: análisis de uso del sitio web</td>
                    <td className="border border-gray-300 px-4 py-2">2 años</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-xs">_fbp</td>
                    <td className="border border-gray-300 px-4 py-2">Marketing</td>
                    <td className="border border-gray-300 px-4 py-2">Meta Pixel: seguimiento de conversiones publicitarias</td>
                    <td className="border border-gray-300 px-4 py-2">3 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Tipos de cookies según su finalidad</h2>
            <ul className="list-disc list-inside pl-4 space-y-2">
              <li>
                <strong>Cookies técnicas (necesarias):</strong> Imprescindibles para el funcionamiento del sitio web.
                Permiten la navegación, el inicio de sesión y el procesamiento de pagos. No requieren consentimiento.
              </li>
              <li>
                <strong>Cookies analíticas:</strong> Nos permiten medir y analizar cómo los usuarios utilizan el sitio web
                para mejorar nuestro servicio. Solo se activan si aceptas su uso.
              </li>
              <li>
                <strong>Cookies de marketing:</strong> Se utilizan para medir la efectividad de nuestras campañas publicitarias.
                Solo se activan si aceptas su uso.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">¿Cómo gestionar las cookies?</h2>
            <p>
              Al acceder a Simulia por primera vez, se te muestra un aviso de cookies donde puedes aceptar o rechazar
              las cookies no esenciales. Puedes cambiar tus preferencias en cualquier momento.
            </p>
            <p className="mt-4">
              También puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que desactivar
              algunas cookies puede afectar al funcionamiento de la plataforma. Consulta la ayuda de tu navegador:
            </p>
            <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
              <li>Chrome: Configuración → Privacidad y seguridad → Cookies</li>
              <li>Firefox: Opciones → Privacidad y seguridad</li>
              <li>Safari: Preferencias → Privacidad</li>
              <li>Edge: Configuración → Cookies y permisos del sitio</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Servicios de terceros</h2>
            <ul className="list-disc list-inside pl-4 space-y-2">
              <li>
                <strong>Google Analytics 4 (Google LLC):</strong> Analítica web.
                Política de privacidad de Google disponible en policies.google.com/privacy.
              </li>
              <li>
                <strong>Meta Pixel (Meta Platforms Inc.):</strong> Seguimiento de conversiones.
                Política de privacidad de Meta disponible en facebook.com/privacy/policy.
              </li>
              <li>
                <strong>Stripe (Stripe Inc.):</strong> Procesamiento de pagos.
                Política de privacidad de Stripe disponible en stripe.com/privacy.
              </li>
              <li>
                <strong>Firebase (Google LLC):</strong> Autenticación de usuarios.
                Política de privacidad de Firebase disponible en firebase.google.com/support/privacy.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Actualizaciones de esta política</h2>
            <p>
              Esta política de cookies puede actualizarse para adaptarse a cambios normativos o modificaciones en
              los servicios ofrecidos. Te recomendamos revisarla periódicamente. Última actualización: junio de 2026.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Contacto</h2>
            <p>
              Si tienes dudas sobre nuestra política de cookies, puedes contactarnos en{' '}
              <a href="mailto:hola@simulia.es" className="text-primary hover:underline">
                hola@simulia.es
              </a>.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>
              Consulta también:{' '}
              <Link to="/aviso-legal" className="text-primary hover:underline">Aviso Legal</Link> ·{' '}
              <Link to="/politica-privacidad" className="text-primary hover:underline">Política de Privacidad</Link> ·{' '}
              <Link to="/terminos-condiciones" className="text-primary hover:underline">Términos y Condiciones</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
