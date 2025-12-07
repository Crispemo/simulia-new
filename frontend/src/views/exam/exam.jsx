import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './exam.module.css';
import QuestionBox from '../../components/QuestionBox';
import Pagination from '../../components/Pagination';
import { API_URL } from '../../config';

/**
 * Vista reutilizable de examen
 * @param {Object} props
 * @param {Array} props.questions - Array de preguntas
 * @param {Array} props.userAnswers - Array de respuestas del usuario
 * @param {Function} props.handleAnswerClick - Función para manejar clic en respuesta
 * @param {Object} props.markedAsDoubt - Objeto con preguntas marcadas como duda
 * @param {Function} props.toggleDoubtMark - Función para marcar/desmarcar duda
 * @param {Function} props.onSave - Función para guardar progreso
 * @param {Function} props.onFinalize - Función para finalizar examen
 * @param {Function} props.onPause - Función para pausar/reanudar
 * @param {Function} props.onDownload - Función para descargar PDF
 * @param {Function} props.onExit - Función para salir del examen
 * @param {number} props.timeLeft - Tiempo restante en segundos
 * @param {number} props.totalTime - Tiempo total en segundos
 * @param {boolean} props.isPaused - Si el examen está pausado
 * @param {boolean} props.isSaving - Si se está guardando
 * @param {boolean} props.hasPendingChanges - Si hay cambios pendientes
 * @param {string} props.examType - Tipo de examen (simulacro, protocolos, contrarreloj, etc.)
 * @param {boolean} props.isReviewMode - Si está en modo revisión
 * @param {Object} props.correctAnswersMap - Mapa de respuestas correctas (para modo revisión)
 * @param {Function} props.answerIsCorrect - Función para verificar si respuesta es correcta
 * @param {string} props.justification - Texto de justificación (modo revisión)
 * @param {boolean} props.showTimeBar - Mostrar barra de tiempo por pregunta
 * @param {number} props.timePerQuestion - Tiempo por pregunta en segundos
 * @param {Function} props.onTimeUp - Callback cuando se acaba el tiempo
 * @param {Array} props.disabledButtons - Array de botones a deshabilitar
 * @param {boolean} props.isDarkMode - Si está en modo oscuro
 * @param {Function} props.onImpugnarSubmit - Callback para manejar impugnación (recibe questionId y reason)
 * @param {number} props.currentQuestion - Índice de la pregunta actual (controlado)
 * @param {Function} props.onNavigate - Callback para navegar a una pregunta (recibe index)
 */
const ExamView = ({
  questions = [],
  userAnswers = [],
  handleAnswerClick,
  markedAsDoubt = {},
  toggleDoubtMark,
  onSave,
  onFinalize,
  onPause,
  onDownload,
  onExit,
  timeLeft = 0,
  totalTime = 0,
  isPaused = false,
  isSaving = false,
  hasPendingChanges = false,
  examType = 'simulacro',
  isReviewMode = false,
  correctAnswersMap = {},
  answerIsCorrect = null,
  justification = null,
  showTimeBar = false,
  timePerQuestion = 40,
  onTimeUp = null,
  disabledButtons = [],
  isDarkMode = false,
  onImpugnarSubmit = null,
  currentQuestion: controlledCurrentQuestion = null,
  onNavigate = null,
}) => {
  const navigate = useNavigate();
  // Si currentQuestion es controlado, usar el prop; sino usar estado interno
  const [internalCurrentQuestion, setInternalCurrentQuestion] = useState(0);
  const currentQuestion = controlledCurrentQuestion !== null ? controlledCurrentQuestion : internalCurrentQuestion;
  const setCurrentQuestion = controlledCurrentQuestion !== null ? (onNavigate || (() => {})) : setInternalCurrentQuestion;
  
  const [currentPage, setCurrentPage] = useState(0);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const questionsPerPage = 25;

  // Calcular porcentaje completado
  const answeredCount = userAnswers.filter(answer => 
    answer && (
      (typeof answer === 'object' && answer.selectedAnswer !== null && answer.selectedAnswer !== undefined) ||
      (typeof answer !== 'object' && answer !== null && answer !== undefined)
    )
  ).length;

  const completionPercentage = questions.length > 0 
    ? Math.round((answeredCount / questions.length) * 100) 
    : 0;

  // Formatear tiempo
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Manejar navegación de preguntas
  const handleNavigate = (index) => {
    if (controlledCurrentQuestion !== null && onNavigate) {
      // Si está controlado, usar el callback
      onNavigate(index);
    } else {
      // Si no está controlado, usar estado interno
      setInternalCurrentQuestion(index);
    }
    const newPage = Math.floor(index / questionsPerPage);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };
  
  // Sincronizar currentPage cuando cambia currentQuestion
  useEffect(() => {
    const newPage = Math.floor(currentQuestion / questionsPerPage);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  }, [currentQuestion, questionsPerPage]);

  // Manejar impugnación - usar callback si está disponible, sino usar lógica interna
  const handleImpugnar = (questionId) => {
    setIsDisputing(true);
  };

  const handleDisputeSubmit = async (questionId) => {
    // Si hay un callback de impugnación externo, usarlo
    if (onImpugnarSubmit) {
      await onImpugnarSubmit(questionId, disputeReason);
      setIsDisputing(false);
      setDisputeReason('');
      return;
    }

    // Lógica interna por defecto
    const disputeData = {
      question: questions[questionId]?.question || "Pregunta no disponible",
      reason: disputeReason,
      userAnswer: userAnswers[questionId] || null,
    };

    try {
      const response = await fetch(`${API_URL}/send-dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disputeData),
      });

      if (response.ok) {
        setIsDisputing(false);
        setDisputeReason('');
        // Aquí podrías mostrar una notificación de éxito
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsDisputing(false);
      setDisputeReason('');
    }
  };

  // Generar estado de items para paginación
  const generateItemStatus = () => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      // Si tiene respuesta, marcar como answered (incluso si también tiene duda)
      // La duda se manejará con el prop doubtMarkedQuestions
      if (userAnswers[i] && 
          (typeof userAnswers[i] === 'object' ? 
           userAnswers[i].selectedAnswer : 
           userAnswers[i])) {
        status[i] = 'answered';
      } else if (markedAsDoubt[i]) {
        // Solo marcar como doubt si no tiene respuesta
        status[i] = 'doubt';
      }
    }
    return status;
  };

  // Obtener nombre del examen según tipo
  const getExamTypeName = (type) => {
    const names = {
      'simulacro': 'SIMULACRO',
      'protocolos': 'PROTOCOLOS',
      'contrarreloj': 'CONTRARRELOJ',
      'quizz': 'QUIZZ',
      'errores': 'ERRORES',
      'personalizado': 'PERSONALIZADO',
      'anteriores': 'AÑOS ANTERIORES'
    };
    return names[type] || 'EXAMEN';
  };

  return (
    <div className={styles.examContainer}>
      {/* Header */}
      <header className={styles.examHeader}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.exitButton}
            onClick={onExit || (() => navigate('/dashboard'))}
            aria-label="Salir del examen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Salir</span>
          </button>
          
          <div className={styles.timeDisplay}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.actionButtons}>
            {/* Botón Guardar */}
            {!disabledButtons.includes('save') && !isReviewMode && (
              <button
                className={`${styles.actionButton} ${isSaving ? styles.saving : ''} ${hasPendingChanges ? styles.pendingChanges : ''}`}
                onClick={onSave}
                disabled={isSaving}
                aria-label="Guardar progreso"
                title="Guardar progreso"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>Guardar</span>
              </button>
            )}

            {/* Botón Pausar */}
            {!disabledButtons.includes('pause') && !isReviewMode && (
              <button
                className={styles.actionButton}
                onClick={onPause}
                aria-label={isPaused ? "Reanudar" : "Pausar"}
                title={isPaused ? "Reanudar" : "Pausar"}
              >
                {isPaused ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                )}
                <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
              </button>
            )}

            {/* Botón Descargar PDF */}
            {!disabledButtons.includes('download') && onDownload && (
              <button
                className={styles.actionButton}
                onClick={onDownload}
                aria-label="Descargar PDF"
                title="Descargar PDF"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>PDF</span>
              </button>
            )}

            {/* Botón Finalizar */}
            {!isReviewMode && (
              <button
                className={`${styles.actionButton} ${styles.finalizeButton}`}
                onClick={() => setShowFinalizePopup(true)}
                aria-label="Finalizar examen"
                title="Finalizar examen"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Finalizar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra de progreso */}
      <div className={styles.progressSection}>
        <div className={styles.progressInfo}>
          <span className={styles.questionCounter}>
            Pregunta {currentQuestion + 1} de {questions.length}
          </span>
          <span className={styles.completionText}>{completionPercentage}% completado</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar}
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Contenedor principal */}
      <main className={styles.examMain}>
        {/* QuestionBox */}
        {questions.length > 0 && (
          <QuestionBox
            currentQuestion={currentQuestion}
            questions={questions}
            userAnswers={userAnswers}
            handleAnswerClick={handleAnswerClick}
            markedAsDoubt={markedAsDoubt}
            toggleDoubtMark={toggleDoubtMark}
            onNavigate={handleNavigate}
            onImpugnar={handleImpugnar}
            isDarkMode={isDarkMode}
            showCorrectness={isReviewMode}
            correctAnswersMap={correctAnswersMap}
            isReviewMode={isReviewMode}
            answerIsCorrect={answerIsCorrect}
            showTimeBar={showTimeBar}
            onTimeUp={onTimeUp}
            timePerQuestion={timePerQuestion}
            isPaused={isPaused}
          />
        )}

        {/* Justificación (solo en modo revisión) */}
        {isReviewMode && justification && (
          <div className={styles.justificationCard}>
            <div className={styles.justificationHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <h3>Justificación</h3>
            </div>
            <div className={styles.justificationContent}>
              <p>{justification}</p>
              {questions[currentQuestion]?.subject && (
                <p className={styles.subjectInfo}>
                  Tema: {questions[currentQuestion].subject}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Paginación */}
      {questions.length > 0 && (
        <Pagination
          totalItems={questions.length}
          itemsPerPage={questionsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemSelect={handleNavigate}
          activeItemIndex={currentQuestion}
          itemStatus={generateItemStatus()}
          doubtMarkedQuestions={markedAsDoubt}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Popup de finalización */}
      {showFinalizePopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h2>¿Finalizar el examen?</h2>
            <p>
              Has respondido {answeredCount} de {questions.length} preguntas.
            </p>
            <div className={styles.popupButtons}>
              <button
                className={styles.popupButton}
                onClick={() => setShowFinalizePopup(false)}
              >
                Continuar revisando
              </button>
              <button
                className={`${styles.popupButton} ${styles.popupButtonPrimary}`}
                onClick={() => {
                  setShowFinalizePopup(false);
                  if (onFinalize) onFinalize();
                }}
              >
                Finalizar examen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de impugnación */}
      {isDisputing && (
        <div className={styles.popupOverlay}>
          <div className={styles.disputeModal}>
            <button
              className={styles.modalCloseButton}
              onClick={() => {
                setIsDisputing(false);
                setDisputeReason('');
              }}
            >
              ×
            </button>
            <h3>Escribe tu razón para impugnar</h3>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Escribe tu razón para impugnar"
              className={styles.disputeTextarea}
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => handleDisputeSubmit(currentQuestion)}
                className={styles.submitDisputeButton}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamView;

