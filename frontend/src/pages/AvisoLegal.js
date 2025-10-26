import React from 'react';

export default function AvisoLegal() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-20 px-6">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Aviso Legal</h1>

        <div className="space-y-8 text-gray-800 text-base leading-relaxed">
          <p>En cumplimiento con el deber de información recogido en la Ley 34/2002, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se informa que este sitio web pertenece a:</p>

          <ul className="list-disc list-inside pl-4">
            <li><strong>Titular:</strong> Cristina Peris Moreno</li>
            <li><strong>Sitio web:</strong> https://www.simulia.es</li>
            <li><strong>Correo electrónico de contacto:</strong> simuliaproject@simulia.es</li>
          </ul>

          <p><strong>Objeto del sitio web:</strong><br />
          Simulia es una plataforma educativa digital para la preparación del examen EIR, que ofrece simulacros personalizados, análisis de resultados y contenido interactivo para usuarios registrados.</p>

          <p><strong>Responsabilidad:</strong><br />
          La titular no se hace responsable del mal uso que se realice del contenido de este sitio web ni de los daños derivados del uso indebido de la plataforma.</p>
        </div>
      </div>
    </section>
  );
}
