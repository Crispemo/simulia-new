import React, { useEffect, useState } from 'react';

const VIEWS = [
  { key: 'ia', label: 'Análisis IA', icon: '🤖', caption: 'Identifica qué fallaste y por qué' },
  { key: 'progreso', label: 'Progreso', icon: '📊', caption: 'Tu evolución semana a semana' },
  { key: 'examen', label: 'Examen en vivo', icon: '📝', caption: 'Simulacro cronometrado' },
];

function HeroShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % VIEWS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const view = VIEWS[active];

  return (
    <div
      className="absolute -top-6 -left-6 z-10 w-44 sm:w-52 rounded-2xl bg-card border border-border shadow-soft-lg p-4 hidden sm:block"
      aria-hidden="true"
    >
      <div key={view.key} className="hero-showcase-content space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{view.icon}</span>
          <span className="text-xs font-semibold text-secondary">{view.label}</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '80%' }} />
          </div>
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '55%' }} />
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 leading-snug">{view.caption}</p>
        </div>
      </div>
      <div className="flex gap-1 justify-center mt-3">
        {VIEWS.map((v, idx) => (
          <span
            key={v.key}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === active ? 'w-4 bg-primary' : 'w-1.5 bg-primary/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroShowcase;
