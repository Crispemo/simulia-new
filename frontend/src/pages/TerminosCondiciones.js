import React from 'react';
import { Helmet } from "react-helmet";
import { Link } from 'react-router-dom';

export default function TerminosCondiciones() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <Helmet>
        <title>Condiciones de Contratación | Simulia</title>
        <meta name="description" content="Condiciones de contratación de Simulia. Precios, suscripción, prueba gratuita, cancelación y derecho de desistimiento." />
      </Helmet>
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <Link to="/" className="text-primary hover:underline text-sm mb-6 inline-block">← Volver a Simulia</Link>
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Condiciones de Contratación</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <p>
            Las presentes condiciones regulan la contratación de los servicios de suscripción de Simulia, conforme
            al Real Decreto Legislativo 1/2007 (TRLGDCU) y la Ley 34/2002 (LSSI-CE).
          </p>

          <div>
            <h2 className="text-2xl font-semibold mb-2">1. Identificación del prestador</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Titular:</strong> Cristina Peris Moreno</li>
              <li><strong>Domicilio profesional:</strong> Valencia, España</li>
              <li><strong>Correo electrónico:</strong> hola@simulia.es</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">2. Objeto del contrato</h2>
            <p>
              Simulia ofrece acceso a una plataforma online de preparación para el examen EIR mediante suscripción de
              pago. El servicio incluye simulacros, modos de práctica, análisis de rendimiento, protocolos clínicos
              y herramientas de estudio según el plan contratado.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">3. Planes y precios</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm mt-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Plan</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Precio</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Explora sin presión</td>
                    <td className="border border-gray-300 px-4 py-2">11,99 €/mes</td>
                    <td className="border border-gray-300 px-4 py-2">Mensual</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Voy a por la plaza</td>
                    <td className="border border-gray-300 px-4 py-2">59,99 €/año</td>
                    <td className="border border-gray-300 px-4 py-2">Anual</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Todos los precios incluyen IVA. El pago se realiza a través de Stripe (certificación PCI-DSS). En ningún
              momento Simulia almacena datos de tarjeta de crédito.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">4. Prueba gratuita</h2>
            <p>
              Ambos planes incluyen un período de prueba gratuita de 7 días. Durante este período, el usuario tiene
              acceso completo al servicio. Si no se cancela antes de que finalice la prueba, se realizará el primer
              cobro automáticamente.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">5. Renovación automática</h2>
            <p>
              La suscripción se renueva automáticamente al final de cada período (mensual o anual) salvo que el usuario
              la cancele antes de la fecha de renovación. El usuario será notificado del cobro próximo conforme a los
              plazos legales.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">6. Derecho de desistimiento</h2>
            <p>
              De acuerdo con el TRLGDCU, dispones de <strong>14 días naturales</strong> desde la contratación para
              ejercer tu derecho de desistimiento sin necesidad de justificación.
            </p>
            <p className="mt-2">
              <strong>Excepción:</strong> Si durante esos 14 días has accedido al contenido digital (simulacros,
              análisis, etc.), el derecho de desistimiento se extingue conforme al artículo 103.m) del TRLGDCU,
              siempre que hayas dado tu consentimiento expreso al inicio de la prestación.
            </p>
            <p className="mt-2">
              Para ejercer el desistimiento, envía un correo a{' '}
              <a href="mailto:hola@simulia.es" className="text-primary hover:underline">hola@simulia.es</a>{' '}
              indicando tu voluntad de desistir. El reembolso se realizará en un plazo máximo de 14 días.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">7. Cancelación de la suscripción</h2>
            <p>
              Puedes cancelar tu suscripción en cualquier momento. La cancelación se hará efectiva al final del período
              de facturación en curso, manteniendo el acceso hasta esa fecha. No se realizan reembolsos proporcionales
              por el tiempo restante del período ya pagado.
            </p>
            <p className="mt-2">
              Para cancelar, contacta a hola@simulia.es o utiliza la opción de gestión de suscripción
              disponible en tu panel de Stripe.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">8. Modificaciones del servicio o precio</h2>
            <p>
              Simulia se reserva el derecho de modificar las características del servicio o los precios. Los cambios
              de precio no afectarán al período de suscripción en curso. Los usuarios activos serán notificados con
              antelación suficiente para que puedan decidir si continúan con la suscripción.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">9. Resolución de incidencias</h2>
            <p>
              Para cualquier incidencia relacionada con el servicio o los pagos, contacta en{' '}
              <a href="mailto:hola@simulia.es" className="text-primary hover:underline">hola@simulia.es</a>.
              El plazo de respuesta es de 5 días laborables.
            </p>
            <p className="mt-2">
              La Comisión Europea pone a disposición de los consumidores una plataforma de resolución de litigios
              en línea accesible en ec.europa.eu/consumers/odr.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">10. Legislación aplicable</h2>
            <p>
              Estas condiciones se rigen por la legislación española, en particular por el TRLGDCU y la LSSI-CE.
              Para la resolución de controversias serán competentes los juzgados y tribunales del domicilio del
              consumidor.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Última actualización: junio de 2026.</p>
            <p className="mt-2">
              Consulta también:{' '}
              <Link to="/aviso-legal" className="text-primary hover:underline">Aviso Legal</Link> ·{' '}
              <Link to="/politica-privacidad" className="text-primary hover:underline">Política de Privacidad</Link> ·{' '}
              <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
