import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const STRIPE_PAYMENT_LINK_EXPLORAR = 'https://buy.stripe.com/28E8wP8AIda05BLcqG6Zy0g';
const STRIPE_PAYMENT_LINK_PLAZA = 'https://buy.stripe.com/bJefZheZ6c5Wfclaiy6Zy0i';

export default function Precios() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Helmet>
        <title>Precios Simulia – Explorar 11,99 € / Voy a por la plaza 23,99 € | Preparación EIR</title>
        <meta
          name="description"
          content="Elige tu plan de preparación EIR: Explorar desde 11,99 €/mes o Voy a por la plaza desde 23,99 €/mes, con simulacros reales, banco de +15.000 preguntas y 7 días de prueba gratis."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.simulia.es/precios" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Precios Simulia – Explorar 11,99 € / Voy a por la plaza 23,99 €" />
        <meta property="og:description" content="Prueba Simulia gratis 7 días. Elige Explorar o Voy a por la plaza según cuánto quieras entrenar para el EIR." />
        <meta property="og:url" content="https://www.simulia.es/precios" />
        <meta property="og:image" content="https://www.simulia.es/Dashboard-EIR-Simulia.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Simulia",
            "description": "Plataforma de preparación EIR con simulacros reales y análisis de errores por IA",
            "offers": [
              {
                "@type": "Offer",
                "name": "Explorar",
                "price": "11.99",
                "priceCurrency": "EUR",
                "url": "https://www.simulia.es/precios"
              },
              {
                "@type": "Offer",
                "name": "Voy a por la plaza",
                "price": "23.99",
                "priceCurrency": "EUR",
                "url": "https://www.simulia.es/precios"
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-12">
          <Link to="/" className="text-primary hover:underline text-sm">← Volver a Simulia</Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
            Elige cómo quieres preparar el EIR
          </h1>
          <p className="text-lg sm:text-xl text-foreground">
            7 días de prueba gratis en los dos planes. Cancela antes de que se te cobre, sin coste ni compromiso.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 items-start">
          {/* Explorar */}
          <div className="bg-card border border-border shadow-md hover:shadow-lg transition-all rounded-xl p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-secondary">Explorar</h2>
              <p className="text-sm text-muted-foreground mb-4">Prueba Simulia sin presión</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-secondary">11,99 €</span>
                <span className="text-muted-foreground text-lg">/mes</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                7 días de prueba gratis · cancela cuando quieras
              </div>
            </div>
            <div className="bg-muted/40 rounded-xl p-6 border border-border">
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Simulacro EIR oficial — hasta 4 al mes</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Corrección y resultado de cada simulacro</span></li>
                <li className="flex items-start gap-3 opacity-60"><Lock className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Quizz Rápido, Repite Errores, Protocolario, Contrarreloj y Personalizado <span className="text-xs font-semibold uppercase tracking-wide">· No incluido</span></span></li>
                <li className="flex items-start gap-3 opacity-60"><Lock className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Banco completo de preguntas por asignatura <span className="text-xs font-semibold uppercase tracking-wide">· No incluido</span></span></li>
                <li className="flex items-start gap-3 opacity-60"><Lock className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Contacto por WhatsApp <span className="text-xs font-semibold uppercase tracking-wide">· No incluido</span></span></li>
                <li className="flex items-start gap-3 opacity-60"><Lock className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Analítica de fallos por asignatura <span className="text-xs font-semibold uppercase tracking-wide">· No incluido</span></span></li>
              </ul>
            </div>
            <div className="max-w-sm mx-auto space-y-2">
              <a
                href={STRIPE_PAYMENT_LINK_EXPLORAR}
                className="block w-full text-center bg-secondary hover:bg-secondary/90 shadow-md hover:shadow-lg transition-all text-white py-3 rounded-full font-bold"
              >
                Empieza gratis 7 días
              </a>
              <p className="text-center text-xs text-muted-foreground">
                Después, 11,99 €/mes. Cancela cuando quieras.
              </p>
            </div>
          </div>

          {/* Voy a por la plaza */}
          <div className="bg-card border-2 border-primary relative shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-card to-primary/5 rounded-xl p-8 pt-12 md:pt-8 space-y-6">
            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold shadow-lg whitespace-nowrap">
                Recomendado
              </span>
            </div>
            <div className="mt-2 md:mt-0">
              <h2 className="text-2xl font-bold mb-2 text-secondary">Voy a por la plaza</h2>
              <p className="text-sm text-muted-foreground mb-4">Todo lo que necesitas hasta el examen, sin límites</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">23,99 €</span>
                <span className="text-muted-foreground text-lg">/mes</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                7 días de prueba gratis · cancela cuando quieras
              </div>
            </div>
            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Simulacro EIR oficial — ilimitado</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Quizz, Errores, Protocolario, Contrarreloj, Personalizado y Escalas — ilimitados</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Banco completo de +15.000 preguntas por asignatura</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Respuestas justificadas pregunta a pregunta</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Posibilidad de impugnación si detectas un error</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Acceso a la comunidad de WhatsApp</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Analítica de fallos por asignatura</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Actualizaciones de preguntas durante toda tu preparación</span></li>
              </ul>
            </div>
            <div className="max-w-sm mx-auto space-y-2">
              <a
                href={STRIPE_PAYMENT_LINK_PLAZA}
                className="block w-full text-center bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-white py-3 rounded-full font-bold"
              >
                Empieza gratis 7 días
              </a>
              <p className="text-center text-xs text-muted-foreground">
                Después, 23,99 €/mes. Cancela cuando quieras.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-16 space-y-4">
          <h2 className="text-2xl font-bold text-secondary text-center mb-6">¿Cómo se compara con una academia EIR?</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 px-4 text-secondary">Criterio</th>
                  <th className="text-left py-3 px-4 text-secondary">Academia EIR</th>
                  <th className="text-left py-3 px-4 text-secondary">Simulia</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-medium text-secondary">Compromiso</td>
                  <td className="py-3 px-4">Anual, con contrato</td>
                  <td className="py-3 px-4">Mensual, sin permanencia</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-medium text-secondary">Garantía</td>
                  <td className="py-3 px-4">Poco habitual</td>
                  <td className="py-3 px-4">7 días de prueba gratis</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-muted-foreground text-sm">
            ¿Quieres verlo con más detalle? Lee la comparativa completa entre{' '}
            <Link to="/blog/academia-eir-vs-preparacion-cuenta" className="text-primary hover:underline">
              academia, preparación por tu cuenta y modelo híbrido
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
