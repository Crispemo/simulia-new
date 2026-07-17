import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';

const goToPlans = (navigate) => {
  navigate('/');
  setTimeout(() => {
    const pricingSection = document.querySelector('#planes');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
};

export default function Precios() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Helmet>
        <title>Precios Simulia – Planes desde 4,99 €/mes | Preparación EIR</title>
        <meta
          name="description"
          content="Compara los planes de Simulia: desde 4,99 €/mes con 7 días de prueba gratuita. Simulacros reales, análisis de errores con IA y +15.000 preguntas, sin permanencia."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.simulia.es/precios" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Precios Simulia – Planes desde 4,99 €/mes" />
        <meta property="og:description" content="Compara los planes de Simulia: desde 4,99 €/mes con 7 días de prueba gratuita, sin permanencia." />
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
                "name": "Explora sin presión",
                "price": "11.99",
                "priceCurrency": "EUR",
                "url": "https://www.simulia.es/precios"
              },
              {
                "@type": "Offer",
                "name": "Voy a por la plaza",
                "price": "59.99",
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
            Precios de Simulia: elige tu plan de preparación EIR
          </h1>
          <p className="text-lg sm:text-xl text-foreground">
            Sin permanencia, con 7 días de prueba gratuita en ambos planes. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-card border-2 border-border hover:border-primary/50 transition-all shadow-lg hover:shadow-xl rounded-xl p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-secondary">Explora sin presión</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">11,99 €</span>
                <span className="text-muted-foreground text-lg">/mes</span>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Flexibilidad total: cancela cuando quieras</span></li>
              <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">7 días gratis para probar sin compromiso</span></li>
              <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Simulacros y modos de práctica (con tiempo e imágenes)</span></li>
              <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Actualizaciones de preguntas y contenido de práctica</span></li>
              <li className="flex items-start gap-3"><span className="text-destructive text-xl mt-0.5">✗</span><span className="text-secondary">Biblioteca de Recursos (guías/plantillas)</span></li>
              <li className="flex items-start gap-3"><span className="text-destructive text-xl mt-0.5">✗</span><span className="text-secondary">Comunidad completa</span></li>
            </ul>
            <button
              onClick={() => goToPlans(navigate)}
              className="w-full bg-primary/10 border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all py-3 rounded-full font-bold shadow-md hover:shadow-lg"
            >
              Comenzar prueba gratuita
            </button>
          </div>

          <div className="bg-card border-2 border-primary relative shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-card to-primary/5 rounded-xl p-8 pt-12 md:pt-8 space-y-6">
            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold shadow-lg whitespace-nowrap">
                Más popular • Ahorra 84 €
              </span>
            </div>
            <div className="mt-2 md:mt-0">
              <h2 className="text-2xl font-bold mb-2 text-secondary">Voy a por la plaza</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">59,99 €</span>
                <span className="text-muted-foreground text-lg">/año</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <span className="line-through">143,88 €</span> • Equivale a 4,99 €/mes
              </div>
            </div>
            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Acceso completo durante todo el año</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">7 días gratis para probar</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Biblioteca de Recursos (guías/plantillas) y materiales</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Comunidad completa (dudas, presentaciones y recursos)</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Ahorra 84 € al año (vs 11,99 € × 12)</span></li>
                <li className="flex items-start gap-3"><span className="text-success text-xl mt-0.5">✓</span><span className="text-secondary">Actualizaciones de preguntas y contenido durante todo el año</span></li>
              </ul>
            </div>
            <button
              onClick={() => goToPlans(navigate)}
              className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-white py-3 rounded-full font-bold"
            >
              Comenzar prueba gratuita
            </button>
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
                  <td className="py-3 px-4 font-medium text-secondary">Coste anual</td>
                  <td className="py-3 px-4">1.500 € – 3.000 €</td>
                  <td className="py-3 px-4">59,99 € (4,99 €/mes)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-medium text-secondary">Compromiso</td>
                  <td className="py-3 px-4">Anual, con contrato</td>
                  <td className="py-3 px-4">Mensual o anual, sin permanencia</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-medium text-secondary">Prueba antes de pagar</td>
                  <td className="py-3 px-4">Poco habitual</td>
                  <td className="py-3 px-4">7 días gratis</td>
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
