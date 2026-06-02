import React from 'react';

const keys = [
  {
    num: '1',
    color: '#ef4444',
    bg: '#fef2f2',
    title: 'Sistema de puntuación',
    items: ['+3 correcta · −1 incorrecta · 0 en blanco', 'Si no eliminas ninguna opción → deja en blanco', 'Eliminas 1 → responde · Eliminas 2 → responde siempre'],
  },
  {
    num: '2',
    color: '#f97316',
    bg: '#fff7ed',
    title: 'Las tres pasadas',
    items: ['1ª pasada: lo que sabes (máx. 45 seg/preg)', '2ª pasada: dudas con eliminación', '3ª pasada: revisión final (últimos 20 min)'],
  },
  {
    num: '3',
    color: '#eab308',
    bg: '#fefce8',
    title: 'Lectura correcta',
    items: ['Lee el enunciado completo', 'Formula tu respuesta ANTES de ver opciones', 'Lee las 4 opciones sin saltarte ninguna', 'Detecta: EXCEPTO · NO · PRIMERO · NUNCA'],
  },
  {
    num: '4',
    color: '#22c55e',
    bg: '#f0fdf4',
    title: 'Técnica de eliminación',
    items: ['Descarta lo clínicamente imposible', 'Descarta lenguaje absoluto injustificado', 'Descarta acción antes de valoración', 'Entre similares: elige la más específica'],
  },
  {
    num: '5',
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'Casos clínicos',
    items: ['Valorar ANTES de actuar', 'Seguridad del paciente primero', 'Fisiológico > psicológico', 'Modelo ABC: vía aérea → respiración → circulación'],
  },
  {
    num: '6',
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'Gestión del tiempo',
    items: ['200 preguntas · 4 horas = 1 min 12 seg/preg', '1ª pasada: 90–100 min', '2ª pasada: 60–80 min', 'Si llevas +2 min: marca y pasa'],
  },
  {
    num: '7',
    color: '#6366f1',
    bg: '#eef2ff',
    title: '¿Cambiar la respuesta?',
    items: ['Sí: si encuentras info nueva en otra pregunta', 'Sí: si detectas palabra clave que se te pasó', 'Sí: si puedes explicar por qué es mejor', 'No: si solo te entran dudas o nervios'],
  },
  {
    num: '8',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'Preguntas especiales',
    items: ['Negación (NO/EXCEPTO): busca la opción FALSA', 'Dos opciones similares: busca la diferencia clave', 'Farmacología: elimina por lógica clínica', 'Priorización: aplica modelo ABC'],
  },
  {
    num: '9',
    color: '#ec4899',
    bg: '#fdf2f8',
    title: 'Control mental',
    items: ['Noche anterior: no estudies nada nuevo', '3 respiraciones si sientes pánico (4 in / 6 out)', 'Bloqueo → marca y pasa, sin mirar atrás', 'Cada pregunta es independiente de las anteriores'],
  },
  {
    num: '10',
    color: '#14b8a6',
    bg: '#f0fdfa',
    title: 'Entrena la metodología',
    items: ['Practica cronometrada y sin interrupciones', 'Analiza por qué fallaste cada pregunta', 'Entrena a pasar de preguntas difíciles', 'Mínimo 3 simulacros completos antes del examen'],
  },
];

export default function TipoTestInfographic() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '0 0 2rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: '#fff',
      }}>
        <div style={{ fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.5rem' }}>
          Guía de estrategia
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', lineHeight: 1.2 }}>
          10 Claves para dominar el Tipo Test EIR
        </h2>
        <p style={{ opacity: 0.85, fontSize: '0.95rem', margin: 0 }}>
          Metodología basada en evidencia · Psicología cognitiva aplicada al examen
        </p>

        {/* Puntuación destacada */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {[['✔ Correcta', '+3 pts', '#22c55e'], ['✘ Incorrecta', '−1 pt', '#ef4444'], ['— En blanco', '0 pts', '#94a3b8']].map(([label, val, color]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 1rem', minWidth: '110px' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de claves */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {keys.map((k) => (
          <div key={k.num} style={{
            background: k.bg,
            border: `1.5px solid ${k.color}30`,
            borderRadius: '10px',
            padding: '1rem 1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                background: k.color,
                color: '#fff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                flexShrink: 0,
              }}>{k.num}</div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111' }}>{k.title}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1rem', listStyleType: 'disc' }}>
              {k.items.map((item, i) => (
                <li key={i} style={{ fontSize: '0.82rem', color: '#374151', lineHeight: '1.5', marginBottom: '0.15rem' }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '1.25rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '1.5rem' }}>💡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Regla de oro</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Eliminar 1 opción → responde · Eliminar 2 → responde siempre · No puedes eliminar ninguna → deja en blanco
          </div>
        </div>
      </div>
    </div>
  );
}
