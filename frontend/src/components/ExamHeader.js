import React from 'react';
import styles from './ExamHeader.module.css';

const ExamHeader = ({
  timeLeft,
  onPause,
  onSave,
  onFinish,
  isPaused,
  isSaving,
  hasPendingChanges,
  toggleDarkMode,
  disabledButtons = [],
  onDownload
}) => {
  // Formatear el tiempo (hh:mm:ss)
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={styles.examHeader}>
      <div className={styles.logo}>
        <img src="/Logo_oscuro.png" alt="Logo" width="37" height="39" />
        <h2 className={styles.logoText}>SIMULIA</h2>
      </div>
      
      <div className={styles.timeDisplay}>
        {timeLeft !== undefined && formatTime(timeLeft)}
      </div>
      
      <div className={styles.rightButtons}>
        {/* Botón de descarga PDF */}
        {!disabledButtons.includes('download') && (
          <button 
            onClick={onDownload}
            className={styles.controlBtn}
            aria-label="Descargar PDF"
            title="Descargar PDF"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M5 20h14v-2H5v2m7-18L5.33 9h3.92v4h3.5V9h3.92L12 2z" />
            </svg>
            <span style={{ marginLeft: 6, fontSize: 12 }}>PDF</span>
          </button>
        )}

        {/* Botón de pausa */}
        {!disabledButtons.includes('pause') && (
          <button 
            onClick={onPause} 
            className={styles.controlBtn} 
            aria-label={isPaused ? "Reanudar" : "Pausar"}
          >
            {isPaused ? (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
              </svg>
            )}
          </button>
        )}
        
        {/* Botón de guardar */}
        {!disabledButtons.includes('save') && (
          <button 
            onClick={onSave} 
            className={`${styles.controlBtn} ${isSaving ? styles.saving : ''} ${hasPendingChanges ? styles.pendingChanges : ''}`}
            aria-label="Guardar progreso"
            disabled={isSaving}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
            </svg>
          </button>
        )}
        
        {/* Botón de finalizar */}
        <button 
          onClick={onFinish} 
          className={styles.controlBtn} 
          aria-label="Finalizar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ExamHeader; 