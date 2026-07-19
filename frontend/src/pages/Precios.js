import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/8x23cv6sAda06FPbmC6Zy0h';

export default function Precios() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Helmet>
        <title>Precios Simulia – 89 € pago único | Preparación EIR</title>
        <meta
          name="description"
          content="Accede a Simulia por 89 € de pago único hasta tu examen EIR. Simulacros reales, análisis de errores con IA y +15.000 preguntas, sin mensualidades."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.simulia.es/precios" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Precios Simulia – 89 € pago único" />
        <meta property="og:description" content="Accede a Simulia por 89 € de pago único hasta tu examen EIR, sin mensualidades." />
        <meta property="og:url" content="https://www.simulia.es/precios" />
        <meta property="og:image" content="https://www.simulia.es/Dashboard-EIR-Simulia.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Simulia",
            "description": "Plataforma de preparación EIR con simulacros reales y análisis de errores por IA",
            "offers": {
              "@type": "Offer",
              "name": "Voy a por la plaza",
              "price": "89.00",
              "priceCurrency": "EUR",
              "url": "https://www.simulia.es/precios"
            }
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-12">
          <Link to="/" className="text-primary hover:underline text-sm">← Volver a Simulia</Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
            Precio de Simulia: preparación EIR sin mensualidades
          </h1>
          <p className="text-lg sm:text-xl text-foreground">
            Pago único, sin letra pequeña. Accede hasta tu examen del 23 de enero de 2027.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-card border-2 border-primary relative shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-card to-primary/5 rounded-xl p-8 pt-12 md:pt-8 space-y-6">
            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold shadow-lg whitespace-nowrap">
                Precio único • Sin mensualidades
              </span>
            </div>
            <div className="mt-2 md:mt-0">
              <h2 className="text-2xl font-bold mb-2 text-secondary">Voy a por la plaza</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">89 €</span>
                <span className="text-muted-foreground text-lg">pago único</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Acceso hasta tu examen • 23 de enero de 2027
              </div>
              <div className="text-sm text-muted-foreground">
                Equivale a 0,47 €/día si empiezas hoy
              </div>
            </div>
            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Acceso completo hasta el 23 de enero de 2027</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">7 modos de examen basados en el formato oficial del Ministerio</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Respuestas justificadas pregunta a pregunta</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Posibilidad de impugnación si detectas un error</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Biblioteca de recursos (guías y plantillas)</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Comunidad completa (dudas, presentaciones y recursos)</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Contacto conmigo por WhatsApp</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Actualizaciones de preguntas durante toda tu preparación</span></li>
              </ul>
            </div>
            <div className="max-w-sm mx-auto space-y-2">
              <a
                href={STRIPE_PAYMENT_LINK}
                className="block w-full text-center bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-white py-3 rounded-full font-bold"
              >
                Empieza hoy • 89 €
              </a>
              <p className="text-center text-xs text-muted-foreground">
                Garantía de devolución de 7 días
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
                  <td className="py-3 px-4">Pago único, sin permanencia</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-medium text-secondary">Garantía</td>
                  <td className="py-3 px-4">Poco habitual</td>
                  <td className="py-3 px-4">Devolución en 7 días</td>
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
