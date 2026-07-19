import React, { useEffect, useState } from 'react';

function HeroMockupStack() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % 3);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-video" aria-hidden="true">
      <div
        className={`absolute top-[38%] left-[6%] w-44 sm:w-52 -rotate-6 rounded-2xl bg-card border border-border p-4 transition-all duration-700 ${
          active === 0 ? 'scale-110 z-30 shadow-soft-lg' : 'scale-95 z-0 shadow-soft opacity-80'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📊</span>
          <span className="text-xs font-semibold text-secondary">Progreso</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '70%' }} />
          </div>
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '45%' }} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2 leading-snug">Tu evolución semana a semana</p>
      </div>

      <div
        className={`absolute top-[8%] left-[30%] w-44 sm:w-52 rounded-2xl bg-card border border-border p-4 transition-all duration-700 ${
          active === 1 ? 'scale-110 z-30 shadow-soft-lg' : 'scale-95 z-10 shadow-soft opacity-80'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧩</span>
          <span className="text-xs font-semibold text-secondary">7 modos de práctica</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">📝</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">🔍</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">⏱️</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">🔄</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">✏️</span>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2 leading-snug">Elige cómo practicar hoy</p>
      </div>

      <div
        className={`absolute top-[42%] left-[52%] w-40 sm:w-48 rotate-6 rounded-2xl bg-secondary text-secondary-foreground p-4 transition-all duration-700 ${
          active === 2 ? 'scale-110 z-30 shadow-soft-lg' : 'scale-95 z-0 shadow-soft opacity-80'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤖</span>
          <span className="text-xs font-semibold">Análisis IA</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-white/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-white/50 rounded-full" style={{ width: '75%' }} />
          </div>
          <div className="h-2 rounded-full bg-white/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-white/50 rounded-full" style={{ width: '55%' }} />
          </div>
        </div>
        <p className="text-[11px] text-white/70 pt-2 leading-snug">Identifica qué fallaste y por qué</p>
      </div>
    </div>
  );
}

export default HeroMockupStack;
