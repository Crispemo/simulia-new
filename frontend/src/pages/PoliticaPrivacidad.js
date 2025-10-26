import React from 'react';

export default function PoliticaPrivacidad() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Política de Privacidad</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Responsable del tratamiento</h2>
            <p>Cristina Peris Moreno<br />Email: simuliaproject@simulia.es</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Finalidad del tratamiento</h2>
            <p>Los datos personales tratados a través de la plataforma (vía acceso con cuenta de Google) se utilizan únicamente para ofrecer funcionalidades educativas, analíticas de rendimiento y personalización del estudio.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Base legal</h2>
            <p>Consentimiento del interesado al usar la plataforma y aceptar estas condiciones.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Datos recogidos</h2>
            <ul className="list-disc list-inside pl-4">
              <li>Identificador de cuenta de Google</li>
              <li>Respuestas a exámenes, fallos y aciertos</li>
              <li>Actividad dentro de la plataforma (estadísticas)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Servicios de terceros utilizados</h2>
            <ul className="list-disc list-inside pl-4">
              <li>Google (login y analytics)</li>
              <li>Firebase (gestión de autenticación y datos)</li>
              <li>Stripe (procesamiento de pagos)</li>
              <li>MongoDB (almacenamiento de datos)</li>
              <li>Mailchimp (comunicación con usuarios)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Conservación de datos</h2>
            <p>Se conservarán mientras el usuario tenga cuenta activa. Puede solicitar la eliminación en cualquier momento.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Derechos</h2>
            <p>Puedes ejercer tus derechos enviando un correo a simuliaproject@simulia.es.</p>
          </div>
        </div>
      </div>
    </section>
  );
}