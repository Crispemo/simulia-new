import React from 'react';
import { Helmet } from "react-helmet";
import { Link } from 'react-router-dom';

export default function PoliticaPrivacidad() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <Helmet>
        <title>Política de Privacidad | Simulia</title>
        <meta name="description" content="Política de privacidad de Simulia. Información sobre el tratamiento de datos personales conforme al RGPD y la LOPDGDD." />
      </Helmet>
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <Link to="/" className="text-primary hover:underline text-sm mb-6 inline-block">← Volver a Simulia</Link>
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Política de Privacidad</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <p>
            Esta política explica qué datos personales recoge simulia.es, con qué finalidad, durante cuánto tiempo
            y cuáles son tus derechos. Conforme al Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica
            3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
          </p>

          <div>
            <h2 className="text-2xl font-semibold mb-2">1. Responsable del tratamiento</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Identidad:</strong> Cristina Peris Moreno</li>
              <li><strong>Actividad:</strong> Plataforma online de preparación para el examen EIR</li>
              <li><strong>Domicilio profesional:</strong> Valencia, España</li>
              <li><strong>Correo electrónico:</strong> hola@simulia.es</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">2. Datos personales tratados</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm mt-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Canal / proceso</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Datos recogidos</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Finalidad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Registro (Google)</td>
                    <td className="border border-gray-300 px-4 py-2">Nombre, email, identificador de cuenta</td>
                    <td className="border border-gray-300 px-4 py-2">Creación y gestión de la cuenta</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Suscripción (Stripe)</td>
                    <td className="border border-gray-300 px-4 py-2">Datos de facturación, historial de pagos</td>
                    <td className="border border-gray-300 px-4 py-2">Procesamiento de pagos. Los datos de tarjeta los gestiona Stripe directamente</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Uso de la plataforma</td>
                    <td className="border border-gray-300 px-4 py-2">Resultados de simulacros, progreso, estadísticas de estudio</td>
                    <td className="border border-gray-300 px-4 py-2">Personalización del aprendizaje y análisis de rendimiento</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Soporte</td>
                    <td className="border border-gray-300 px-4 py-2">Nombre, email, contenido del mensaje</td>
                    <td className="border border-gray-300 px-4 py-2">Atención y resolución de consultas</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Navegación (con consentimiento)</td>
                    <td className="border border-gray-300 px-4 py-2">Datos técnicos de navegación</td>
                    <td className="border border-gray-300 px-4 py-2">Analítica web (GA4) para mejorar el servicio</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              No se realiza ningún tipo de marketing masivo ni envío de newsletters sin consentimiento expreso del usuario.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">3. Base legal del tratamiento</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Ejecución de contrato:</strong> Registro, suscripción y uso de la plataforma</li>
              <li><strong>Consentimiento:</strong> Cookies analíticas y de marketing</li>
              <li><strong>Obligación legal:</strong> Conservación de datos de facturación</li>
              <li><strong>Interés legítimo:</strong> Seguridad del sistema y prevención de fraude</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">4. Plazos de conservación</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Datos de cuenta:</strong> Mientras la cuenta esté activa + 1 año tras la baja</li>
              <li><strong>Datos de facturación:</strong> 5 años desde cada transacción (obligación fiscal)</li>
              <li><strong>Resultados y estadísticas:</strong> Mientras la cuenta esté activa; eliminados a los 12 meses de la baja</li>
              <li><strong>Cookies analíticas:</strong> Hasta 13 meses</li>
              <li><strong>Solicitudes de soporte:</strong> 3 años</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">5. Destinatarios de los datos</h2>
            <p>Los datos pueden comunicarse a los siguientes prestadores de servicios:</p>
            <ul className="list-disc list-inside pl-4 space-y-1 mt-2">
              <li><strong>Stripe, Inc.:</strong> Procesamiento de pagos (certificación PCI-DSS)</li>
              <li><strong>Google LLC:</strong> Autenticación (Firebase), analítica web (GA4 vía GTM)</li>
              <li><strong>Proveedor de hosting:</strong> IONOS</li>
            </ul>
            <p className="mt-2">
              Cuando la normativa lo exija, los datos podrán comunicarse a las autoridades competentes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">6. Tus derechos (RGPD)</h2>
            <p>Puedes ejercer los siguientes derechos enviando un correo a hola@simulia.es:</p>
            <ul className="list-disc list-inside pl-4 space-y-1 mt-2">
              <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre ti</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
              <li><strong>Supresión:</strong> Solicitar la eliminación de tus datos</li>
              <li><strong>Limitación:</strong> Restringir el tratamiento en determinadas circunstancias</li>
              <li><strong>Portabilidad:</strong> Recibir tus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos</li>
              <li><strong>Retirada de consentimiento:</strong> En cualquier momento, sin efecto retroactivo</li>
            </ul>
            <p className="mt-3">
              <strong>Plazo de respuesta:</strong> 1 mes desde la recepción de la solicitud (art. 12.3 RGPD).
            </p>
            <p className="mt-2">
              Si consideras que tus derechos no han sido debidamente atendidos, puedes presentar una reclamación ante
              la <strong>Agencia Española de Protección de Datos (AEPD)</strong> — www.aepd.es.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">7. Medidas de seguridad</h2>
            <p>
              Se aplican medidas técnicas y organizativas para proteger tus datos: cifrado de contraseñas, comunicaciones
              HTTPS, y delegación del procesamiento de pagos a Stripe (certificación PCI-DSS). El acceso a los datos está
              restringido al personal estrictamente necesario.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">8. Menores</h2>
            <p>
              Los servicios de Simulia están dirigidos a personas mayores de 18 años. No se recogen conscientemente
              datos de menores de edad.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">9. Actualización de esta política</h2>
            <p>
              Esta política puede actualizarse para adaptarse a cambios normativos o modificaciones en el servicio.
              La versión vigente estará siempre disponible en esta página. Última actualización: junio de 2026.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">10. Contacto</h2>
            <p>
              Para cualquier consulta sobre protección de datos, contacta en{' '}
              <a href="mailto:hola@simulia.es" className="text-primary hover:underline">
                hola@simulia.es
              </a>.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>
              Consulta también:{' '}
              <Link to="/aviso-legal" className="text-primary hover:underline">Aviso Legal</Link> ·{' '}
              <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link> ·{' '}
              <Link to="/terminos-condiciones" className="text-primary hover:underline">Condiciones de Contratación</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
