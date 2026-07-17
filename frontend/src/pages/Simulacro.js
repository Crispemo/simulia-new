import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';

const goToApp = (navigate) => {
  navigate('/');
  setTimeout(() => {
    const pricingSection = document.querySelector('#planes');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
};

const faqs = [
  {
    q: '¿El simulacro EIR es gratis?',
    a: 'Puedes probar Simulia gratis durante 7 días, con acceso al simulacro oficial y al resto de modos de práctica. Pasado ese periodo, sigue con el plan que elijas o cancela sin coste ni permanencia.'
  },
  {
    q: '¿El simulacro replica el examen real?',
    a: 'Sí. Sigue el formato exacto de la convocatoria oficial: 200 preguntas más 10 de reserva, 4 horas de duración, con preguntas de imagen clínica incluidas.'
  },
  {
    q: '¿Cómo sé en qué estoy fallando?',
    a: 'Al terminar el simulacro obtienes la corrección al instante, con justificación de cada respuesta y un desglose de aciertos y fallos por asignatura, para saber exactamente dónde reforzar.'
  },
  {
    q: '¿Puedo hacer el simulacro desde el móvil?',
    a: 'Sí, funciona en móvil, tablet y ordenador, y tu progreso se sincroniza entre dispositivos.'
  }
];

export default function Simulacro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Helmet>
        <title>Simulacro EIR gratis online: practica el examen real | Simulia</title>
        <meta
          name="description"
          content="Haz un simulacro EIR con el formato exacto del examen oficial: 200 preguntas + 10 de reserva, 4 horas, imágenes clínicas y corrección al instante. Prueba gratis 7 días."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.simulia.es/simulacro" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Simulacro EIR gratis online | Simulia" />
        <meta property="og:description" content="Practica con el formato exacto del examen EIR: 200 preguntas + 10 de reserva, 4 horas, imágenes clínicas y corrección al instante." />
        <meta property="og:url" content="https://www.simulia.es/simulacro" />
        <meta property="og:image" content="https://www.simulia.es/Dashboard-EIR-Simulia.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a }
            }))
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-14">
          <Link to="/" className="text-primary hover:underline text-sm">← Volver a Simulia</Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
            Simulacro EIR: practica el examen real con corrección al instante
          </h1>
          <p className="text-lg sm:text-xl text-foreground">
            200 preguntas + 10 de reserva, 4 horas, imágenes clínicas incluidas. El mismo formato que te vas a encontrar el día del examen.
          </p>
          <button
            onClick={() => goToApp(navigate)}
            className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-white py-3 px-8 rounded-full font-bold"
          >
            Haz tu simulacro EIR — prueba gratis 7 días
          </button>
        </div>

        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6 mb-16">
          <div className="bg-card border-2 border-border rounded-xl p-6 space-y-2">
            <span className="text-2xl">📝</span>
            <h3 className="font-bold text-secondary">Formato oficial exacto</h3>
            <p className="text-sm text-muted-foreground">200 preguntas tipo test + 10 de reserva, 4 horas de duración, basadas en convocatorias reales del Ministerio de Sanidad.</p>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-6 space-y-2">
            <span className="text-2xl">🩺</span>
            <h3 className="font-bold text-secondary">Preguntas con imagen clínica</h3>
            <p className="text-sm text-muted-foreground">Incluye los casos con imágenes que forman parte del examen real, no solo texto.</p>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-6 space-y-2">
            <span className="text-2xl">🤖</span>
            <h3 className="font-bold text-secondary">Corrección y análisis por IA</h3>
            <p className="text-sm text-muted-foreground">Al terminar, ves qué has fallado y por qué, con justificación de cada respuesta y desglose por asignatura.</p>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-6 space-y-2">
            <span className="text-2xl">📊</span>
            <h3 className="font-bold text-secondary">Progreso entre simulacros</h3>
            <p className="text-sm text-muted-foreground">Compara tus resultados entre convocatorias de práctica y detecta en qué asignaturas mejoras y en cuáles te estancas.</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-muted-foreground">
            El simulacro oficial es uno de los 7 modos de práctica de Simulia. También puedes repetir tus errores, entrenar a contrarreloj o crear un examen personalizado por asignatura — todo con el mismo banco de <Link to="/blog/banco-preguntas-eir" className="text-primary hover:underline">más de 15.000 preguntas</Link>.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-secondary text-center mb-6">Preguntas frecuentes</h2>
          {faqs.map((f, idx) => (
            <div key={idx} className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">{f.q}</summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">{f.a}</p>
              </details>
            </div>
          ))}
          <p className="text-center text-muted-foreground text-sm pt-4">
            ¿Quieres organizarte antes de empezar? Consulta nuestro{' '}
            <Link to="/blog/plan-estudio-eir" className="text-primary hover:underline">plan de estudio EIR mes a mes</Link>{' '}
            o revisa los <Link to="/precios" className="text-primary hover:underline">planes y precios</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
