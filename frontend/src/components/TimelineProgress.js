import React, { useState, useEffect } from 'react';
import './TimelineProgress.css';

const TimelineProgress = () => {
  // Fecha fija del examen EIR (meta)
  const examDate = new Date('2026-01-24T00:00:00');
  
  // Estado para almacenar el porcentaje y días restantes
  const [progressPercent, setProgressPercent] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    // Calcular los días y el progreso
    const calculateProgress = () => {
      // Fecha actual
      const today = new Date();
      
      // Establecemos la fecha de inicio como 9 meses antes del examen
      const nineMonthsBeforeExam = new Date(examDate);
      nineMonthsBeforeExam.setMonth(examDate.getMonth() - 9);
      
      // Total de días en el periodo de preparación (9 meses)
      const totalDays = Math.floor((examDate.getTime() - nineMonthsBeforeExam.getTime()) / (1000 * 60 * 60 * 24));
      
      // Días que han pasado desde el inicio de la preparación
      const daysPassed = Math.floor((today.getTime() - nineMonthsBeforeExam.getTime()) / (1000 * 60 * 60 * 24));
      
      // Días restantes hasta el examen
      const remaining = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Aseguramos que el porcentaje esté entre 0 y 100
      const percent = Math.max(0, Math.min((daysPassed / totalDays) * 100, 100));
      
      setProgressPercent(percent);
      setDaysRemaining(Math.max(0, remaining));
    };
    
    calculateProgress();
    
    // Actualizar cada día
    const interval = setInterval(calculateProgress, 86400000); // 24 horas
    
    return () => clearInterval(interval);
  }, [examDate]);



  return (
    <div className="timeline-progress">
      <div className="timeline-header">
        <div className="timeline-title">Preparación EIR</div>
        <div className="timeline-countdown">
          {daysRemaining} días para el examen
        </div>
      </div>
      
      <div className="timeline-line">
        <div 
          className="timeline-progress-bar"
          style={{ width: `${progressPercent}%` }}
        ></div>
        
        {/* Marcador de 9 meses */}
        <div className="timeline-marker" style={{ left: '0%' }}>
          <div className="timeline-dot"></div>
          <div className="timeline-label">Inicio</div>
        </div>
        
        {/* Marcador de 6 meses */}
        <div className="timeline-marker" style={{ left: '33%' }}>
          <div className="timeline-dot"></div>
          <div className="timeline-label">6 meses</div>
        </div>
        
        {/* Marcador de 3 meses */}
        <div className="timeline-marker" style={{ left: '67%' }}>
          <div className="timeline-dot"></div>
          <div className="timeline-label">3 meses</div>
        </div>
        
        {/* Marcador de examen */}
        <div className="timeline-marker final" style={{ left: '100%' }}>
          <div className="timeline-dot final">
            <span role="img" aria-label="Meta" style={{ 
              fontSize: '11px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%'
            }}>🏁</span>
          </div>
          <div className="timeline-label final">EIR 24/01/26</div>
        </div>
      </div>
    </div>
  );
};

export default TimelineProgress; 