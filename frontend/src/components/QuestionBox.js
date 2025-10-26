import React, { useState, useEffect } from 'react';
import styles from './QuestionBox.module.css';

const QuestionBox = ({
  currentQuestion,
  questions,
  userAnswers,
  handleAnswerClick,
  markedAsDoubt,
  toggleDoubtMark,
  onNavigate,
  onImpugnar,
  isDarkMode,
  showCorrectness = false,
  correctAnswersMap = {},
  isReviewMode = false,
  answerIsCorrect = null, // Nueva prop para determinar si una respuesta es correcta
  showTimeBar = false, // Nueva prop para mostrar la barra de tiempo
  onTimeUp = null, // Callback cuando se acaba el tiempo
  timePerQuestion = 40 // Tiempo por pregunta en segundos
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDarkModeActive, setIsDarkModeActive] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(timePerQuestion);

  // Reiniciar el tiempo cuando cambia la pregunta actual
  useEffect(() => {
    if (showTimeBar) {
      setQuestionTimeLeft(timePerQuestion);
    }
  }, [currentQuestion, showTimeBar, timePerQuestion]);

  // Timer para la barra de tiempo
  useEffect(() => {
    let timer;
    
    if (showTimeBar && questionTimeLeft > 0 && !isReviewMode) {
      timer = setInterval(() => {
        setQuestionTimeLeft(prev => {
          if (prev <= 1) {
            // Tiempo agotado, ejecutar callback si existe
            if (onTimeUp) {
              onTimeUp();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [showTimeBar, questionTimeLeft, isReviewMode, onTimeUp]);

  // Detectar el modo oscuro basado en la clase del HTML
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark-mode');
      setIsDarkModeActive(isDark);
    };

    // Comprobar inicialmente
    checkDarkMode();

    // Configurar un observador para detectar cambios en las clases de HTML
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    // Limpiar el observador al desmontar
    return () => observer.disconnect();
  }, []);

  // Función para manejar la selección/deselección de respuestas
  const handleOptionClick = (questionIndex, option) => {
    // Si la opción ya está seleccionada, deseleccionarla
    if (userAnswers[questionIndex] === option || 
        (userAnswers[questionIndex] && typeof userAnswers[questionIndex] === 'object' && 
         userAnswers[questionIndex].selectedAnswer === option)) {
      // Llamamos a handleAnswerClick con null para deseleccionar
      handleAnswerClick(questionIndex, null);
    } else {
      // Si no está seleccionada, la seleccionamos normalmente
      handleAnswerClick(questionIndex, option);
    }
  };

  // Manejar cuando no hay preguntas o la pregunta actual no es válida
  if (!questions || questions.length === 0 || !questions[currentQuestion]) {
    return <div className={styles.errorMessage}>Error al cargar la pregunta.</div>;
  }

  const currentQuestionData = questions[currentQuestion];
  const hasImage = currentQuestionData.image || (currentQuestionData.imagen && currentQuestionData.imagen !== '');
  const imagePath = currentQuestionData.image || currentQuestionData.imagen;
  
  // Get the correct answer from the question data or correctAnswersMap
  const rawCorrectAnswer =
    correctAnswersMap[currentQuestion] !== undefined
      ? correctAnswersMap[currentQuestion]
      : (currentQuestionData.correctAnswer !== undefined
          ? currentQuestionData.correctAnswer
          : currentQuestionData.answer);

  // Normalizar la respuesta correcta a TEXTO de opción
  // Si viene como índice 1-5 (número o string numérico), mapear a option_1..option_5
  const normalizeCorrectAnswerToText = (value) => {
    if (value === null || value === undefined) return null;
    const maybeNumber = Number(value);
    if (!Number.isNaN(maybeNumber) && maybeNumber >= 1 && maybeNumber <= 5) {
      const optionKey = `option_${maybeNumber}`;
      return currentQuestionData[optionKey] || null;
    }
    // Si ya viene como texto, devolver tal cual
    return String(value);
  };

  const correctAnswerText = normalizeCorrectAnswerToText(rawCorrectAnswer);
  
  // Get the current user's answer - Adaptado para manejar el nuevo formato
  const userAnswerData = userAnswers[currentQuestion];
  
  // Extraer la respuesta seleccionada del objeto, o usar el valor directo en formatos antiguos
  const userAnswer = userAnswerData && typeof userAnswerData === 'object' && userAnswerData.selectedAnswer !== undefined
    ? userAnswerData.selectedAnswer  // Nuevo formato
    : userAnswerData;                // Formato antiguo (valor directo)
  
  // Check if the user's answer is correct
  let isCorrect;
  
  // Si se proporciona la función answerIsCorrect, usarla como fuente de verdad
  if (typeof answerIsCorrect === 'function') {
    isCorrect = answerIsCorrect(currentQuestion);
  } else {
    // Fallback al cálculo manual
    isCorrect = Boolean(userAnswer) && (String(userAnswer) === String(correctAnswerText));
  }
  
  const isAnswerCorrect = isCorrect;

  // Obtener las opciones, manejando diferentes formatos posibles
  const options = currentQuestionData.options && currentQuestionData.options.length > 0
    ? currentQuestionData.options.filter(opt => opt && opt !== '-')
    : [
        currentQuestionData.option_1,
        currentQuestionData.option_2,
        currentQuestionData.option_3,
        currentQuestionData.option_4,
        currentQuestionData.option_5
      ].filter(opt => opt && opt !== '-');

  // Manejador para togglear el estado de duda
  const handleToggleDoubt = () => {
    // Llamar al método del componente padre para actualizar el estado
    toggleDoubtMark(currentQuestion);
    
    // Mostrar mensaje de confirmación visual
    const button = document.getElementById('doubt-button');
    if (button) {
      // Agregamos una clase para una pequeña animación de feedback
      button.classList.add(styles.buttonFeedback);
      // Eliminamos la clase después de la animación
      setTimeout(() => {
        button.classList.remove(styles.buttonFeedback);
      }, 300);
    }
  };

  // Renderizar imagen de la pregunta
  const renderQuestionImage = (imagePath) => {
    if (!imagePath) return null;
    
    // Asegurar que la ruta es correcta y añadir timestamp para evitar caché
    const timestamp = new Date().getTime();
    const fullPath = imagePath.startsWith('http') || imagePath.startsWith('/') 
      ? `${imagePath}?t=${timestamp}`
      : `/examen_fotos/${imagePath}?t=${timestamp}`;
    
    return (
      <>
        <div className={styles.questionImage}>
          <img
            src={fullPath}
            alt="Imagen de la pregunta"
            className={styles.examImage}
            onClick={() => {
              setSelectedImage(fullPath);
              setShowImageModal(true);
            }}
            style={{ cursor: 'pointer' }}
            onLoad={() => console.log('Imagen cargada correctamente:', fullPath)}
            onError={(e) => {
              console.error('Error al cargar imagen:', fullPath);
              e.target.style.display = 'none';
              
              const errorMsg = document.createElement('div');
              errorMsg.className = styles.imageErrorMessage;
              errorMsg.textContent = 'Imagen no disponible';
              e.target.parentNode.appendChild(errorMsg);
            }}
          />
        </div>

        {showImageModal && selectedImage && (
          <div className={styles.imageModalOverlay} onClick={() => setShowImageModal(false)}>
            <div className={styles.imageModal}>
              <img src={selectedImage} alt="Imagen ampliada" />
              <button className={styles.closeModal} onClick={() => setShowImageModal(false)}>×</button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Determinar la clase de tema
  const themeClass = isDarkModeActive ? styles.darkTheme : styles.lightTheme;

  return (
    <div className={`${styles.questionContainer} ${themeClass}`}>
      {/* Contador de preguntas y navegación */}
      <div className={styles.questionHeader}>
        <div className={styles.questionCounterSection}>
          <span className={styles.questionCount}>Pregunta {currentQuestion + 1} de {questions.length}</span>
        </div>
      </div>

      {/* Barra de tiempo por pregunta */}
      {showTimeBar && !isReviewMode && (
        <div className={styles.timeBarContainer}>
          <div 
            className={`${styles.timeBar} ${questionTimeLeft <= 10 ? styles.timeCritical : ''}`}
            style={{ width: `${(questionTimeLeft / timePerQuestion) * 100}%` }}
          ></div>
        </div>
      )}

      <div className={styles.questionBox}>
        <h3>
          {currentQuestionData.exam_name ? `(${currentQuestionData.exam_name}) ` : ''}
          {currentQuestionData.question || 'Pregunta no disponible'}
        </h3>

        <div className={`${styles.questionContent} ${hasImage ? styles.withImage : ''}`}>
          {hasImage && renderQuestionImage(imagePath)}

          <div className={styles.optionsContainer}>
            {options.map((option, index) => {
              // Determine button class based on selection and correctness
              let buttonClass = '';
              
              // En modo revisión maneja la visualización diferente
              if (isReviewMode) {
                if (userAnswer === option) {
                  buttonClass = styles.selected;
                  
                  // Si la respuesta del usuario es correcta
                  if (isAnswerCorrect) {
                    buttonClass += ` ${styles.correct}`;
                  } else {
                    buttonClass += ` ${styles.incorrect}`;
                  }
                } 
                // Si esta es la respuesta correcta pero no la seleccionada por el usuario
                else if (correctAnswerText === option) {
                  buttonClass = styles.correctAnswer;
                }
              } else {
                // Comportamiento normal para examen
                if (userAnswer === option) {
                  buttonClass = styles.selected;
                  
                  // If showCorrectness is true and the answer is correct, add correct class
                  if (showCorrectness && isAnswerCorrect) {
                    buttonClass += ` ${styles.correct}`;
                  }
                } else if (showCorrectness && option === correctAnswerText) {
                  // If showing correctness and this is the correct option, highlight it
                  buttonClass = styles.correctAnswer;
                }
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(currentQuestion, option)}
                  className={buttonClass}
                  disabled={isReviewMode} // Deshabilitar clics en modo revisión
                >
                  {option}
                  {(showCorrectness || isReviewMode) && correctAnswerText === option && (
                    <span className={styles.correctIndicator}> ✓</span>
                  )}
                  {isReviewMode && userAnswer === option && !isAnswerCorrect && (
                    <span className={styles.incorrectIndicator}> ✗</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Suprimido: la justificación se mostrará solo en el contenedor inferior dedicado */}
        </div>

        {/* Botones para navegación lateral y acción */}
        <div className={styles.actionNavContainer}>
          <button
            className={`${styles.sideNavButton} ${styles.prevButton}`}
            onClick={() => onNavigate(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            &#9664;
          </button>
          
          <div className={styles.examActionButtons}>
            {/* Ocultar botones de acción en modo revisión o mostrar versión adaptada */}
            {!isReviewMode ? (
              <>
                <button
                  id="impugnar-button"
                  onClick={() => onImpugnar(currentQuestion)}
                  className={styles.customImpugnarBtn}
                >
                  Impugnar
                </button>

                <button
                  id="doubt-button"
                  className={`${styles.customDoubtBtn} ${markedAsDoubt[currentQuestion] ? styles.doubtMarked : ''}`}
                  onClick={handleToggleDoubt}
                >
                  {markedAsDoubt[currentQuestion] ? 'Dudosa' : 'Marcar duda'}
                </button>
              </>
            ) : (
              <div className={styles.reviewInfo}>
   
              </div>
            )}
          </div>
          
          <button
            className={`${styles.sideNavButton} ${styles.nextButton}`}
            onClick={() => onNavigate(Math.min(questions.length - 1, currentQuestion + 1))}
            disabled={currentQuestion === questions.length - 1}
          >
            &#9654;
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionBox; 