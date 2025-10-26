import React from 'react';

export default function TerminosCondiciones() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Términos y Condiciones de Uso</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Uso de la plataforma</h2>
            <p>El acceso a Simulia implica la aceptación plena de estas condiciones por parte del usuario. Simulia ofrece simulacros y funcionalidades educativas, sin garantía de éxito en el examen oficial.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Registro y acceso</h2>
            <p>El usuario debe acceder mediante cuenta de Google válida. Toda la información proporcionada debe ser veraz.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Propiedad intelectual</h2>
            <p>Todo el contenido, código, diseño y funcionalidades de la plataforma son propiedad exclusiva de Cristina Peris Moreno, y están protegidos por derechos de autor. Queda prohibida su reproducción o uso sin autorización expresa.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Pagos y acceso</h2>
            <p>El acceso completo puede requerir el pago de una suscripción. El usuario será informado del coste y duración antes de pagar.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">Modificaciones</h2>
            <p>Simulia se reserva el derecho de modificar el sitio o estas condiciones sin previo aviso.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
