import React from 'react';
import { Helmet } from "react-helmet";
import { Link } from 'react-router-dom';

export default function AvisoLegal() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <Helmet>
        <title>Aviso Legal | Simulia</title>
        <meta name="description" content="Aviso legal de Simulia. Datos identificativos, condiciones de uso y propiedad intelectual." />
      </Helmet>
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <Link to="/" className="text-primary hover:underline text-sm mb-6 inline-block">← Volver a Simulia</Link>
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Aviso Legal</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <p>
            En cumplimiento del deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio, de
            Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se facilitan los
            siguientes datos identificativos del titular de este sitio web:
          </p>

          <div>
            <h2 className="text-2xl font-semibold mb-2">1. Datos identificativos</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Titular:</strong> Cristina Peris Moreno</li>
              <li><strong>Domicilio profesional:</strong> Valencia, España</li>
              <li><strong>Sitio web:</strong> https://www.simulia.es</li>
              <li><strong>Correo electrónico:</strong> simuliaproject@simulia.es</li>
              <li><strong>Actividad:</strong> Plataforma online de preparación para el examen EIR</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">2. Ámbito de aplicación</h2>
            <p>
              El acceso y/o registro en simulia.es implica la aceptación plena de las presentes condiciones, así como
              de la <Link to="/politica-privacidad" className="text-primary hover:underline">Política de Privacidad</Link> y
              la <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>.
            </p>
            <p className="mt-2">
              El titular se reserva el derecho a modificar estos términos en cualquier momento. Las modificaciones
              sustanciales se comunicarán con antelación razonable a los usuarios registrados.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">3. Registro y acceso</h2>
            <p>
              El usuario debe acceder mediante cuenta de Google válida. Al registrarse, el usuario se compromete a
              proporcionar información veraz, mantener la confidencialidad de sus credenciales y notificar cualquier
              acceso no autorizado a su cuenta.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">4. Usos prohibidos</h2>
            <p>Queda expresamente prohibido:</p>
            <ul className="list-disc list-inside pl-4 space-y-1 mt-2">
              <li>Reproducir, distribuir o comercializar el contenido de la plataforma sin autorización expresa</li>
              <li>Extraer o reutilizar de forma sistemática preguntas, simulacros o materiales</li>
              <li>Utilizar bots, scrapers o sistemas automatizados de extracción</li>
              <li>Introducir virus, malware o cualquier código malicioso</li>
              <li>Intentar acceder a áreas restringidas del sistema sin autorización</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">5. Propiedad intelectual</h2>
            <p>
              Todo el contenido de la plataforma — incluyendo preguntas, simulacros, protocolos, escalas, textos,
              diseño, código fuente y materiales educativos — es propiedad exclusiva de Cristina Peris Moreno y está
              protegido por la legislación española e internacional sobre propiedad intelectual.
            </p>
            <p className="mt-2">
              La suscripción otorga al usuario una licencia de uso personal, no exclusiva e intransferible, limitada
              exclusivamente a la preparación del examen EIR.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">6. Limitación de responsabilidad</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>No se garantiza la disponibilidad ininterrumpida del servicio</li>
              <li>No se garantiza la obtención de resultados específicos en el examen EIR</li>
              <li>Los enlaces externos que puedan aparecer no son responsabilidad del titular</li>
              <li>El titular no se hace responsable del mal uso que se realice del contenido de la plataforma</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">7. Cancelación y baja</h2>
            <p>
              El usuario puede cancelar su suscripción y solicitar la baja en cualquier momento. El procedimiento
              de cancelación y sus condiciones se detallan en
              las <Link to="/terminos-condiciones" className="text-primary hover:underline">Condiciones de Contratación</Link>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">8. Legislación aplicable y jurisdicción</h2>
            <p>
              El presente aviso legal se rige por la legislación española. Para la resolución de cualquier controversia
              derivada del uso de este sitio web, las partes se someten a los juzgados y tribunales del domicilio del
              usuario en caso de consumidores, conforme a la normativa vigente.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">9. Contacto</h2>
            <p>
              Para cualquier consulta relacionada con este aviso legal, puedes contactarnos en{' '}
              <a href="mailto:simuliaproject@simulia.es" className="text-primary hover:underline">
                simuliaproject@simulia.es
              </a>.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>
              Consulta también:{' '}
              <Link to="/politica-privacidad" className="text-primary hover:underline">Política de Privacidad</Link> ·{' '}
              <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link> ·{' '}
              <Link to="/terminos-condiciones" className="text-primary hover:underline">Condiciones de Contratación</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
