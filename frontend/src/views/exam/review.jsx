import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, CreditCard } from 'lucide-react';
import styles from './review.module.css';
import QuestionBox from '../../components/QuestionBox';
import Pagination from '../../components/Pagination';
import { API_URL } from '../../config';
import { downloadExamPdfFromData } from '../../lib/pdfUtils';
import { useAuth } from '../../context/AuthContext';

/**
 * Vista reutilizable para revisión de exámenes
 * @param {Object} props
 * @param {string} props.examId - ID del examen a revisar
 * @param {Function} props.onExit - Función para salir (default: navega a /dashboard)
 * @param {Function} props.toggleDarkMode - Función para alternar modo oscuro
 * @param {boolean} props.isDarkMode - Si está en modo oscuro
 */
const ReviewView = ({
  examId,
  onExit = null,
  toggleDarkMode = null,
  isDarkMode = false,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const [exam, setExam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [convertingFlashcards, setConvertingFlashcards] = useState(false);
  const [flashcardMessage, setFlashcardMessage] = useState(null);
  const questionsPerPage = 25;

  // Utilidad: extraer long_answer desde múltiples ubicaciones posibles
  const getLongAnswer = (q) => {
    if (!q) return '';
    if (q.long_answer) return q.long_answer;
    if (q.questionData && q.questionData.long_answer) return q.questionData.long_answer;
    if (q.userAnswer && typeof q.userAnswer === 'object' && q.userAnswer.questionData && q.userAnswer.questionData.long_answer) {
      return q.userAnswer.questionData.long_answer;
    }
    if (q.user_answer && q.user_answer.questionData && q.user_answer.questionData.long_answer) return q.user_answer.questionData.long_answer;
    if (typeof q.text === 'string' && q.text.includes('Justificación:')) {
      return q.text.split('Justificación:').slice(1).join('Justificación:').trim();
    }
    return '';
  };

  // Normalizar cualquier valor a texto seguro para render
  const normalizeToText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      const joined = value
        .map((v) => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''))
        .filter(Boolean)
        .join(' ');
      return joined;
    }
    if (typeof value === 'object') {
      if (value.text && typeof value.text === 'string') return value.text;
      if (value.content && typeof value.content === 'string') return value.content;
      try {
        return JSON.stringify(value);
      } catch (_) {
        return '';
      }
    }
    return '';
  };

  // Cargar datos del examen
  useEffect(() => {
    const fetchExamReview = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Intentando recuperar examen con ID:", examId);
        
        const isProduction = typeof window !== 'undefined' && 
          (window.location.hostname === 'www.simulia.es' || 
           window.location.hostname === 'simulia.es' ||
           window.location.protocol === 'https:');
        
        const apiUrl = isProduction ? 'https://social-emmi-simulia-845ca5f1.koyeb.app' : API_URL;
        console.log('🔧 REVIEW DEBUG - isProduction:', isProduction, 'apiUrl:', apiUrl);
        
        const response = await fetch(`${apiUrl}/exam-review/${examId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Error al cargar el examen: ${response.status}`);
        }

        const data = await response.json();
        console.log("Datos recibidos del servidor:", data);
        
        // Procesar la respuesta según su estructura
        let processedData;
        if (data.exam && data.questions) {
          processedData = {
            ...data.exam,
            questions: data.questions || []
          };
        } else {
          processedData = data;
        }
        
        setExam(processedData);
        
        // Inicializar markedAsDoubt
        const examDoubtMarks = {};
        
        if (processedData.markedAsDoubt || (data.exam && data.exam.markedAsDoubt)) {
          const doubtData = processedData.markedAsDoubt || data.exam.markedAsDoubt;
          
          if (typeof doubtData === 'object') {
            if (doubtData.dataType === 'Map' && doubtData.value) {
              Object.entries(doubtData.value).forEach(([key, value]) => {
                if (value === true) {
                  examDoubtMarks[key] = true;
                }
              });
            } else {
              Object.entries(doubtData).forEach(([key, value]) => {
                if (value === true) {
                  examDoubtMarks[key] = true;
                }
              });
            }
          }
        }
        
        // Revisar marcas de duda en cada objeto userAnswer
        if (processedData.questions && Array.isArray(processedData.questions)) {
          processedData.questions.forEach((question, index) => {
            if (question.userAnswer && 
                typeof question.userAnswer === 'object' && 
                question.userAnswer.markedAsDoubt === true) {
              examDoubtMarks[index] = true;
            }
          });
        }
        
        setMarkedAsDoubt(examDoubtMarks);
        setCurrentQuestion(0);
        setCurrentPage(0);
        setLoading(false);
      } catch (err) {
        console.error("Error completo:", err);
        setError("Error al cargar el examen: " + (err.message || 'Error desconocido'));
        setLoading(false);
      }
    };
    
    if (examId) {
      fetchExamReview();
    }
  }, [examId]);

  // Manejar navegación de preguntas
  const handleNavigate = (index) => {
    setCurrentQuestion(index);
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

  // Funciones simuladas para mantener compatibilidad con QuestionBox
  const handleAnswerClick = () => {
    // No hace nada en el modo de revisión
  };

  const toggleDoubtMark = () => {
    // No hace nada en el modo de revisión
  };

  const handleImpugnar = () => {
    // No hace nada en el modo de revisión
  };

  // Generar estado de items para paginación
  const generateItemStatus = () => {
    const status = {};
    if (!exam || !exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) return status;

    for (let i = 0; i < exam.questions.length; i++) {
      const hasAnswer = exam.questions[i].userAnswer && 
                       (typeof exam.questions[i].userAnswer === 'object' ? 
                        exam.questions[i].userAnswer.selectedAnswer : exam.questions[i].userAnswer);
      
      const isMarkedAsDoubt = markedAsDoubt[i] || 
                            (exam.questions[i].userAnswer && 
                             typeof exam.questions[i].userAnswer === 'object' && 
                             exam.questions[i].userAnswer.markedAsDoubt === true);
      
      // Si tiene respuesta, marcar como correct/incorrect (incluso si también tiene duda)
      // La duda se manejará con el prop doubtMarkedQuestions
      if (hasAnswer) {
        status[i] = exam.questions[i].isCorrect === true ? 'correct' : 'incorrect';
      } else if (isMarkedAsDoubt) {
        // Solo marcar como doubt si no tiene respuesta
        status[i] = 'doubt';
      } else {
        status[i] = 'unanswered';
      }
    }
    return status;
  };

  // Preparar las preguntas en el formato que espera QuestionBox
  const formattedQuestions = exam?.questions?.map((q, index) => ({
    _id: q._id || index,
    question: q.question || "Texto de la pregunta no disponible",
    option_1: q.option_1 || "Opción A",
    option_2: q.option_2 || "Opción B",
    option_3: q.option_3 || "Opción C",
    option_4: q.option_4 || "Opción D",
    option_5: q.option_5 || "-",
    options: [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt !== '-'),
    answer: q.answer || "",
    image: q.image || "",
    subject: q.subject || "",
    userAnswer: q.userAnswer || null,
    isCorrect: q.isCorrect === true
  })) || [];

  // Extraer respuestas de usuario
  const processedUserAnswers = exam?.questions?.map(q => q.userAnswer || null) || [];

  // Mapear respuestas correctas
  const correctAnswersMap = {};
  exam?.questions?.forEach((question, index) => {
    if (question.answer !== undefined) {
      correctAnswersMap[index] = question.answer;
    }
  });

  // Obtener pregunta actual y justificación
  const currentQuestionData = exam?.questions?.[currentQuestion] || {};
  const longAnswer = getLongAnswer(currentQuestionData);
  const justificationText = normalizeToText(longAnswer || currentQuestionData.explanation || currentQuestionData.justificacion || '');

  // Calcular porcentaje completado
  const answeredCount = processedUserAnswers.filter(answer => 
    answer && (
      (typeof answer === 'object' && answer.selectedAnswer !== null && answer.selectedAnswer !== undefined) ||
      (typeof answer !== 'object' && answer !== null && answer !== undefined)
    )
  ).length;

  const completionPercentage = exam?.questions?.length > 0 
    ? Math.round((answeredCount / exam.questions.length) * 100) 
    : 0;

  // Formatear tiempo (si existe)
  const formatTime = (seconds) => {
    if (!seconds) return '0:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Manejar salida
  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      navigate('/dashboard');
    }
  };

  // Convertir errores en flashcards
  const handleConvertToFlashcards = async () => {
    if (!userId) {
      setFlashcardMessage({ type: 'error', text: 'Debes iniciar sesión para convertir errores en flashcards' });
      return;
    }

    try {
      setConvertingFlashcards(true);
      setFlashcardMessage(null);

      const response = await fetch(`${API_URL}/flashcards/convert-errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al convertir errores en flashcards');
      }

      const data = await response.json();
      
      setFlashcardMessage({
        type: 'success',
        text: `¡Excelente! Se crearon ${data.converted} flashcards${data.skipped > 0 ? ` (${data.skipped} ya existían)` : ''}. Ahora aparecerán en tu flashcard diaria.`
      });

      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        setFlashcardMessage(null);
      }, 5000);

    } catch (err) {
      console.error('Error al convertir errores en flashcards:', err);
      setFlashcardMessage({
        type: 'error',
        text: 'Error al convertir errores en flashcards. Inténtalo de nuevo más tarde.'
      });
    } finally {
      setConvertingFlashcards(false);
    }
  };

  // Estados de carga y error
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>Cargando revisión del examen...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>{error}</div>
        <button onClick={handleExit} className={styles.errorButton}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>No se encontró el examen</div>
        <button onClick={handleExit} className={styles.errorButton}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>El examen no contiene preguntas válidas</div>
        <button onClick={handleExit} className={styles.errorButton}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.examContainer} ${isDarkMode ? styles.dark : ''}`}>
      {/* Header */}
      <header className={styles.examHeader}>
        <div className={styles.headerLeft}>
          <button onClick={handleExit} className={styles.exitButton} aria-label="Salir">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Salir</span>
          </button>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.actionButtons}>
            {/* Botón Convertir en Flashcards */}
            {userId && (
              <button
                className={styles.actionButton}
                onClick={handleConvertToFlashcards}
                disabled={convertingFlashcards}
                aria-label="Convertir mis errores en tarjetas"
                title="Convertir mis errores en tarjetas"
              >
                <CreditCard size={18} />
                <span>{convertingFlashcards ? 'Convirtiendo...' : 'Convertir en tarjetas'}</span>
              </button>
            )}

            {/* Botón Descargar PDF */}
            <button
              className={styles.actionButton}
              onClick={() => downloadExamPdfFromData({
                questions: exam.questions || [],
                title: 'SIMULIA',
                subtitle: `Revisión examen: ${exam.type ? exam.type.toUpperCase() : ''}`,
                logoUrl: '/Logo_oscuro.png',
                examId: examId,
                date: exam.date ? new Date(exam.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
                durationMin: null,
                showAnswerKey: true,
                showBubbleSheet: false,
                fileName: `examen-${examId}-revision.pdf`
              })}
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

            {/* Botón Modo Oscuro */}
            {toggleDarkMode && (
              <button
                className={styles.actionButton}
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? "Modo claro" : "Modo oscuro"}
                title={isDarkMode ? "Modo claro" : "Modo oscuro"}
              >
                {isDarkMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
                <span>{isDarkMode ? 'Claro' : 'Oscuro'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mensaje de flashcard */}
      {flashcardMessage && (
        <div className={`${styles.flashcardMessage} ${styles[flashcardMessage.type]}`}>
          <p>{flashcardMessage.text}</p>
          <button 
            className={styles.flashcardMessageClose}
            onClick={() => setFlashcardMessage(null)}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      {/* Barra de progreso */}
      <div className={styles.progressSection}>
        <div className={styles.progressInfo}>
          <span className={styles.questionCounter}>
            Pregunta {currentQuestion + 1} de {exam.questions.length}
          </span>
          <span className={styles.completionText}>{completionPercentage}% completado</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar}
            style={{ width: `${((currentQuestion + 1) / exam.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <main className={styles.examMain}>
        {/* QuestionBox */}
        {formattedQuestions.length > 0 && (
          <QuestionBox
            currentQuestion={currentQuestion}
            questions={formattedQuestions}
            userAnswers={processedUserAnswers}
            handleAnswerClick={handleAnswerClick}
            markedAsDoubt={markedAsDoubt}
            toggleDoubtMark={toggleDoubtMark}
            onNavigate={handleNavigate}
            onImpugnar={handleImpugnar}
            isDarkMode={isDarkMode}
            showCorrectness={true}
            correctAnswersMap={correctAnswersMap}
            isReviewMode={true}
            answerIsCorrect={(index) => {
              const question = exam.questions[index];
              return question ? question.isCorrect === true : false;
            }}
          />
        )}

        {/* Justificación */}
        {currentQuestionData && (
          <div className={styles.justificationCard}>
            <div className={styles.justificationHeader}>
              <div className={styles.justificationIcon}>
                <Lightbulb size={20} />
              </div>
              <h3 className={styles.justificationTitle}>Justificación</h3>
            </div>
            <p className={styles.justificationText}>
              {justificationText || 'No hay justificación disponible'}
            </p>
            {exam.type !== 'protocolos' && currentQuestionData.subject && (
              <p className={styles.subjectInfo}>
                Tema: {currentQuestionData.subject}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Paginación */}
      {exam.questions.length > 0 && (
        <Pagination
          totalItems={exam.questions.length}
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
    </div>
  );
};

export default ReviewView;

