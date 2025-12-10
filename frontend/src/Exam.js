import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';
import { finalizeExam, getExamType, resumeExam as resumeExamUtil, saveExamProgress } from './lib/examUtils';
import SuccessNotification from './components/SuccessNotification';
import { downloadExamPdfFromData } from './lib/pdfUtils';
import { API_URL } from './config';
import ExamView from './views/exam/exam';

// Debug: Verificar que API_URL se importa correctamente
console.log('🔧 EXAM DEBUG - API_URL importado:', API_URL);

const ErrorDisplay = ({ onRetry, onReturn }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h2>No se pudieron cargar las preguntas</h2>
      <p>Por favor, intenta de nuevo o vuelve al dashboard</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button onClick={onRetry} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Intentar de nuevo
        </button>
        <button onClick={onReturn} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

// Un debounce simple por si no está disponible lodash
const createDebounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Exam = ({ toggleDarkMode, isDarkMode, userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const examMode = searchParams.get('mode');
  
  // Use test_user_1 for testing
  const effectiveUserId = userId;
  
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(16200); // 4h 30min
  const [totalTime, setTotalTime] = useState(16200); // Tiempo total para calcular tiempo usado
  const [isPaused, setPaused] = useState(true); // Siempre iniciar pausado
  const [hasStarted, setHasStarted] = useState(false); // Nuevo estado para controlar si el examen ha comenzado
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [userAnswers, setUserAnswers] = useState([]); // Añadido estado para userAnswers
  const [showStartPopup, setShowStartPopup] = useState(true);
  // Inicializar como true si es simulacro para que se muestre inmediatamente
  const [showExamTypeSelector, setShowExamTypeSelector] = useState(!examMode || examMode === 'simulacro');
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [examType, setExamType] = useState('simulacro');
  const [selectedSimulacroType, setSelectedSimulacroType] = useState(null); // 'protocolos' o 'anteriores'
  console.log('Inicialización del tipo de examen:', examMode, '->', examType);
  const [examId, setExamId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 25;
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Variable para rastrear si ya hay un guardado en progreso y evitar llamadas simultáneas
  const [isSaving, setIsSaving] = useState(false);
  // Variable para rastrear cambios pendientes que requieren guardado
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  // Variable para la última vez que se guardó (para limitar frecuencia)
  const [lastSaveTime, setLastSaveTime] = useState(0);
  
  // Para batching de cambios y reducir peticiones
  const [changesBatch, setChangesBatch] = useState({ 
    answers: {}, // Respuestas que han cambiado
    currentQuestion: null, // Si ha cambiado la pregunta actual
    doubtMarks: {} // Preguntas marcadas como duda que han cambiado
  });
  const [lastBatchTime, setLastBatchTime] = useState(Date.now());
  
  useEffect(() => {
    console.log('questions', questions);
    console.log('userAnswers', userAnswers);
  }, [questions, userAnswers]);
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce ? debounce(() => {
      if (hasPendingChanges && !isSaving) {
        console.log('Ejecutando guardado debounced...');
        queueProgressSave();
      }
    }, 3000) : createDebounce(() => {
      if (hasPendingChanges && !isSaving) {
        console.log('Ejecutando guardado debounced...');
        queueProgressSave();
      }
    }, 3000), 
    [hasPendingChanges, isSaving]
  );
 
  // Función auxiliar para determinar el tipo de examen
  const getExamTypeFromMode = (mode) => {
    switch (mode) {
      case 'errors':
        return 'errores';
      case 'protocol':
        return 'protocolos';
      case 'timed':
        return 'contrarreloj';
      case 'quizz':
        return 'quizz';
      default:
        // Si hay un tipo de simulacro seleccionado, usarlo
        if (selectedSimulacroType === 'protocolos') {
          return 'protocolos';
        } else if (selectedSimulacroType === 'anteriores') {
          return 'simulacro'; // Años anteriores es un tipo de simulacro
        }
        return 'simulacro';
    }
  };
  
  // Función para manejar la selección del tipo de simulacro
  const handleSimulacroTypeSelect = (type) => {
    setSelectedSimulacroType(type);
    setShowExamTypeSelector(false);
    // Cargar preguntas según el tipo seleccionado
    loadQuestions();
  };

  // Modificar loadQuestions para inicializar userAnswers con el formato completo
  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      // Asegurar que se crea un nuevo examen
      setExamId(null);
      
      // Determinar el tipo de examen
      let currentExamType = getExamTypeFromMode(examMode);
      
      // Si hay un tipo de simulacro seleccionado, usarlo
      if (selectedSimulacroType === 'protocolos') {
        currentExamType = 'protocolos';
      } else if (selectedSimulacroType === 'anteriores') {
        currentExamType = 'simulacro'; // Años anteriores
      }
      
      console.log(`Cargando preguntas para examen tipo: ${currentExamType}`);
      console.log('🔧 EXAM DEBUG - API_URL desde config:', API_URL);
      console.log('🔧 EXAM DEBUG - NODE_ENV:', process.env.NODE_ENV);
      console.log('🔧 EXAM DEBUG - hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined');
      
      // Usar API_URL directamente desde config.js (ya tiene la lógica de detección de entorno)
      const effectiveAPI_URL = API_URL;
      
      console.log('🔧 EXAM DEBUG - effectiveAPI_URL:', effectiveAPI_URL);
      
      let allQuestions = [];
      
      // Para el tipo 'errors', cargar desde localStorage en lugar de hacer llamadas API
      if (currentExamType === 'errores') {
        const storedData = localStorage.getItem('errorQuestions');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          allQuestions = parsedData.questions || [];
          
          // Establecer el tiempo desde localStorage
          const storedTime = parsedData.timeAssigned || 0;
          setTimeLeft(storedTime);
          setTotalTime(storedTime);
          
          console.log(`Cargadas ${allQuestions.length} preguntas de errores desde localStorage`);
          console.log(`Tiempo asignado: ${formatTime(storedTime)}`);
        } else {
          throw new Error('No se encontraron preguntas de errores en localStorage');
        }
      } else {
        // Para otros tipos de examen, mantener el comportamiento original
        // Obtener preguntas completas
        const completosURL = `${effectiveAPI_URL}/random-question-completos`;
        let completosData = [];
        
        try {
          const completosResponse = await fetch(completosURL, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
              // Para años anteriores: 190 preguntas completas (sin imágenes) + 10 con imágenes = 200 total
              // Para protocolos: 200 preguntas completas sin imágenes
              count: selectedSimulacroType === 'anteriores' ? 190 : 200,
              examType: currentExamType
            })
          });

          if (completosResponse.ok) {
            completosData = await completosResponse.json();
            console.log(`Recibidas ${completosData.length} preguntas completas`);
          } else {
            // Manejar error de forma más elegante
            if (completosResponse.status === 0 || completosResponse.statusText === '') {
              throw new Error('Error de conexión con el servidor. Verifica que el backend esté corriendo.');
            }
            throw new Error(`Error al cargar preguntas completas: ${completosResponse.status}`);
          }
        } catch (fetchError) {
          // Si es error CORS o de red, mostrar mensaje más útil
          if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('CORS')) {
            throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:5001 y que CORS esté configurado correctamente.');
          }
          throw fetchError;
        }

        // Obtener preguntas con fotos (solo para años anteriores, no para protocolos)
        let fotosData = [];
        // Solo cargar fotos si es simulacro de años anteriores, no si es protocolos
        if (selectedSimulacroType === 'anteriores' || (!selectedSimulacroType && currentExamType === 'simulacro')) {
          try {
            const fotosURL = `${effectiveAPI_URL}/random-fotos`;
            const fotosResponse = await fetch(fotosURL, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ count: 10 })
            });

          if (fotosResponse.ok) {
            fotosData = await fotosResponse.json();
            console.log(`Recibidas ${fotosData.length} preguntas con fotos`);
            
            // LOG CRÍTICO: Ver qué está llegando del backend
            console.log('🔍 FRONTEND - Datos RAW recibidos de /random-fotos:', {
              cantidad: fotosData.length,
              primeraPregunta: fotosData.length > 0 ? {
                _id: fotosData[0]._id,
                hasImage: !!fotosData[0].image,
                hasImagen: !!fotosData[0].imagen,
                imageValue: fotosData[0].image,
                imagenValue: fotosData[0].imagen,
                allKeys: Object.keys(fotosData[0])
              } : null
            });
            
            // NORMALIZAR preguntas con imágenes - LÓGICA SIMPLE
            fotosData = fotosData.map(q => {
              // CRÍTICO: Obtener imagen (debe venir del backend)
              let imageField = q.imagen || q.image || null;
              
              if (imageField) {
                imageField = String(imageField).trim();
                imageField = imageField.replace(/\s+/g, '_');
                imageField = imageField.replace(/\/preguntas\//g, '/examen_fotos/');
                console.log(`✅ FRONTEND - Imagen normalizada para pregunta ${q._id}:`, imageField);
              } else {
                console.error(`❌ FRONTEND - ERROR: Pregunta ${q._id} de random-fotos SIN imagen:`, {
                  image: q.image,
                  imagen: q.imagen,
                  allKeys: Object.keys(q)
                });
              }
              
              return {
                ...q,
                image: imageField,  // CRÍTICO: Campo image
                imagen: imageField, // Mantener ambos
                option_1: q.option_1 || '',
                option_2: q.option_2 || '',
                option_3: q.option_3 || '',
                option_4: q.option_4 || '',
                option_5: q.option_5 || '-'
              };
            });
            
            console.log(`📊 Recibidas ${fotosData.length} preguntas con fotos RAW`);
          } else {
            // No crítico - continuar sin fotos
            console.warn('No se pudieron cargar preguntas con fotos (continuando sin ellas)');
          }
          } catch (fotosError) {
            // No crítico - continuar sin fotos
            if (!fotosError.message?.includes('CORS') && !fotosError.message?.includes('Failed to fetch')) {
              console.warn('Error al cargar preguntas con fotos (no crítico):', fotosError);
            }
          }
        } else {
          console.log('No se cargarán preguntas con fotos (examen de protocolos)');
        }

        // Validar que tengamos preguntas antes de continuar
        if (completosData.length === 0 && fotosData.length === 0) {
          throw new Error('No se pudieron cargar las preguntas del examen. Por favor, verifica tu conexión con el servidor y vuelve a intentarlo.');
        }
        
        // Normalizar preguntas completas - NO deben tener imágenes
        completosData = completosData.map(q => ({
          ...q,
          image: null,  // CRÍTICO: Las 200 primeras NO tienen imagen
          imagen: null,
          option_1: q.option_1 || '',
          option_2: q.option_2 || '',
          option_3: q.option_3 || '',
          option_4: q.option_4 || '',
          option_5: q.option_5 || '-'
        }));
        
        // Combinar las preguntas
        allQuestions = [...completosData, ...fotosData];
        
        // Verificar cuántas tienen imagen
        const withImages = allQuestions.filter(q => q.image || q.imagen).length;
        console.log(`✅ Total preguntas: ${allQuestions.length}, con imagen: ${withImages}`);
        
        // Ajustar el tiempo según el tipo de examen
        if (currentExamType === 'protocolos') {
          // Para protocolos: 30 minutos
          setTimeLeft(1800);
          setTotalTime(1800);
        } else if (currentExamType === 'contrarreloj') {
          // Para contrarreloj: 14 minutos
          setTimeLeft(840);
          setTotalTime(840);
        } else if (currentExamType === 'quizz') {
          // Para quizz: 65 minutos
          setTimeLeft(3900);
          setTotalTime(3900);
        } else {
          // Para simulacro: 4h 30min (16200 segundos)
          setTimeLeft(16200);
          setTotalTime(16200);
        }
      }
      
      console.log(`Total de preguntas: ${allQuestions.length}`);
      
      // Asegurar que TODAS las preguntas tengan el campo 'image' (incluso si es null)
      // Esto es crítico para que QuestionBox pueda detectar las imágenes correctamente
      const questionsWithImageField = allQuestions.map(q => ({
        ...q,
        image: q.image || q.imagen || null, // Asegurar que 'image' esté presente
        imagen: q.imagen || q.image || null // Mantener ambos para compatibilidad
      }));
      
      // Verificar una vez más que las imágenes estén presentes
      const finalCheckWithImages = questionsWithImageField.filter(q => q.image || q.imagen).length;
      console.log(`✅ Verificación final: ${questionsWithImageField.length} preguntas, ${finalCheckWithImages} con campo image/imagen`);
      
      setQuestions(questionsWithImageField);
      
      // Inicializar userAnswers con objetos completos - INCLUYENDO IMAGEN (CÓDIGO ANTIGUO)
      const initialUserAnswers = questionsWithImageField.map(question => {
        const imageField = question.image || question.imagen || null;
        
        return {
          questionId: question._id,
          selectedAnswer: null,
          isCorrect: null,
          markedAsDoubt: false,
          questionData: {
            question: question.question || '',
            option_1: question.option_1 || question.options?.[0] || '',
            option_2: question.option_2 || question.options?.[1] || '',
            option_3: question.option_3 || question.options?.[2] || '',
            option_4: question.option_4 || question.options?.[3] || '',
            option_5: question.option_5 || question.options?.[4] || '-',
            answer: question.answer || question.correctAnswer || '',
            subject: question.subject || question.categoria || 'General',
            image: imageField, // CRÍTICO: Incluir imagen
            long_answer: question.long_answer || ''
          }
        };
      });
      
      // Verificar que las imágenes están en userAnswers
      const userAnswersWithImages = initialUserAnswers.filter(ua => 
        ua && ua.questionData && ua.questionData.image
      ).length;
      console.log(`📊 userAnswers: ${initialUserAnswers.length} total, ${userAnswersWithImages} con imagen`);
      
      setUserAnswers(initialUserAnswers);
      setCurrentQuestion(0);
      
      // Inicializar markedAsDoubt como objeto vacío para un examen nuevo
      // Esto asegura que las marcas de duda de exámenes anteriores no se apliquen
      setMarkedAsDoubt({});

    } catch (error) {
      console.error('Error al cargar preguntas:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Implementar la función que usa la utilidad centralizada
  const resumeExam = async () => {
    try {
      const data = await resumeExamUtil(effectiveUserId);
      
      if (!data || data === false) {
        return false;
      }
      
      const { progress } = data;
      console.log('Restaurando progreso del examen:', progress);
      
      // Establecer el ID del examen para futuras actualizaciones
      if (progress.examId || progress._id) {
        setExamId(progress.examId || progress._id);
        console.log('ID del examen establecido:', progress.examId || progress._id);
      }
      
      // Restaurar las preguntas
      if (progress.questions && Array.isArray(progress.questions)) {
        // Convertir las preguntas al formato usado en el frontend
        const formattedQuestions = progress.questions.map(q => {
          // Normalizar campo de imagen: usar 'image' si existe, sino 'imagen'
          let imageField = q.image || q.imagen || null;
          
          // Normalizar el nombre del archivo de imagen si existe
          if (imageField) {
            // Convertir a string y normalizar
            imageField = String(imageField).trim();
            
            // Si ya es una URL completa, no hacer más normalización
            if (imageField.startsWith('http://') || imageField.startsWith('https://')) {
              // Solo normalizar espacios en el nombre del archivo dentro de la URL
              try {
                const url = new URL(imageField);
                const pathParts = url.pathname.split('/');
                const fileName = pathParts[pathParts.length - 1];
                if (fileName) {
                  const normalizedFileName = fileName.replace(/\s+/g, '_');
                  pathParts[pathParts.length - 1] = normalizedFileName;
                  url.pathname = pathParts.join('/');
                  imageField = url.toString();
                }
              } catch (e) {
                // Si falla el parsing, solo normalizar espacios
                imageField = imageField.replace(/\s+/g, '_');
              }
            } else {
              // Si no es URL completa, normalizar
              imageField = imageField.replace(/\s+/g, '_');
              imageField = imageField.replace(/\/preguntas\//g, '/examen_fotos/');
            }
          }
          
          // Normalizar campo answer: convertir número a string si es necesario
          let answerField = q.answer || q.correctAnswer || '';
          if (typeof answerField === 'number') {
            answerField = String(answerField);
          }
          
          // Manejar opciones: si viene como array, usarlo; sino construir desde option_1, etc.
          const optionsArray = Array.isArray(q.options) && q.options.length > 0
            ? q.options
            : [
                q.option_1 || '',
                q.option_2 || '',
                q.option_3 || '',
                q.option_4 || '',
                q.option_5 || '-'
              ].filter(opt => opt && opt !== '-');
          
          // Manejar tanto el formato guardado como el formato original
          return {
            _id: q.questionId || q._id,
            question: q.question || '',
            option_1: Array.isArray(q.options) ? (q.options[0] || '') : (q.option_1 || ''),
            option_2: Array.isArray(q.options) ? (q.options[1] || '') : (q.option_2 || ''),
            option_3: Array.isArray(q.options) ? (q.options[2] || '') : (q.option_3 || ''),
            option_4: Array.isArray(q.options) ? (q.options[3] || '') : (q.option_4 || ''),
            option_5: Array.isArray(q.options) ? (q.options[4] || '-') : (q.option_5 || '-'),
            options: optionsArray,
            answer: answerField,
            correctAnswer: answerField,
            subject: q.subject || q.categoria || '',
            image: imageField,
            imagen: imageField, // Mantener ambos para compatibilidad
            long_answer: q.long_answer || ''  // Asegurar que long_answer se restaura
          };
        });
        
        setQuestions(formattedQuestions);
        console.log(`Restauradas ${formattedQuestions.length} preguntas`);
        
        // Preparar el array para almacenar las respuestas con objetos completos
        const fullAnswersArray = formattedQuestions.map(question => {
          // Normalizar campo de imagen
          const imageField = question.image || question.imagen || null;
          
          return {
            questionId: question._id,
            selectedAnswer: null,
            isCorrect: null,
            markedAsDoubt: false,
            questionData: {
              question: question.question || '',
              option_1: question.option_1 || question.options?.[0] || '',
              option_2: question.option_2 || question.options?.[1] || '',
              option_3: question.option_3 || question.options?.[2] || '',
              option_4: question.option_4 || question.options?.[3] || '',
              option_5: question.option_5 || question.options?.[4] || '-',
              answer: question.answer || question.correctAnswer || '',
              subject: question.subject || question.categoria || 'General',
              image: imageField,
              long_answer: question.long_answer || ''
            }
          };
        });
        
        // Restaurar las respuestas del usuario
        if (progress.userAnswers) {
          if (Array.isArray(progress.userAnswers)) {
            // Verificar si userAnswers es un array de objetos con el nuevo formato
            if (progress.userAnswers.length > 0 && typeof progress.userAnswers[0] === 'object' && progress.userAnswers[0].questionData) {
              console.log('Restaurando respuestas con el nuevo formato...');
              
              // Verificar si hay long_answer en las respuestas
              const withLongAnswer = progress.userAnswers.filter(
                ua => ua && ua.questionData && ua.questionData.long_answer
              ).length;
              console.log(`Respuestas restauradas con long_answer: ${withLongAnswer} de ${progress.userAnswers.length}`);
              
              // Asegurarnos de que todas las preguntas tengan entradas en userAnswers
              progress.userAnswers.forEach(answer => {
                if (answer && answer.questionId) {
                  const questionIndex = formattedQuestions.findIndex(q => 
                    q._id && answer.questionId && q._id.toString() === answer.questionId.toString()
                  );
                  
                  if (questionIndex !== -1 && answer.selectedAnswer) {
                    fullAnswersArray[questionIndex] = {
                      ...answer,
                      markedAsDoubt: markedAsDoubt[questionIndex] || false
                    };
                  }
                }
              });
              
              // También restaurar selectedAnswers para la UI
              const selectedMap = {};
              fullAnswersArray.forEach((answer, index) => {
                if (answer && answer.selectedAnswer) {
                  selectedMap[index] = answer.selectedAnswer;
                }
              });
              setSelectedAnswers(selectedMap);
              
              console.log(`Restauradas ${progress.userAnswers.filter(a => a && a.selectedAnswer).length} respuestas de usuario`);
            }
            // Si userAnswers es un array de objetos con questionId y selectedAnswer (formato anterior)
            else if (progress.userAnswers.length > 0 && typeof progress.userAnswers[0] === 'object' && progress.userAnswers[0].questionId) {
              
              // Mapear las respuestas a los índices correctos
              progress.userAnswers.forEach(answer => {
                const questionIndex = formattedQuestions.findIndex(
                  q => (q.questionId || q._id) === (answer.questionId || answer._id)
                );
                
                if (questionIndex !== -1 && answer.selectedAnswer) {
                  const currentQuestion = formattedQuestions[questionIndex];
                  
                  // Actualizar el objeto en fullAnswersArray con la respuesta del usuario
                  fullAnswersArray[questionIndex] = {
                    ...fullAnswersArray[questionIndex],
                    selectedAnswer: answer.selectedAnswer,
                    isCorrect: answer.selectedAnswer === currentQuestion.answer || answer.selectedAnswer === currentQuestion.correctAnswer,
                    markedAsDoubt: markedAsDoubt[questionIndex] || false
                  };
                }
              });
              
              // También restaurar selectedAnswers para la UI
              const selectedMap = {};
              fullAnswersArray.forEach((answer, index) => {
                if (answer && answer.selectedAnswer) {
                  selectedMap[index] = answer.selectedAnswer;
                }
              });
              setSelectedAnswers(selectedMap);
              
              console.log(`Restauradas ${progress.userAnswers.filter(a => a && a.selectedAnswer).length} respuestas de usuario`);
            } else {
              // Si userAnswers es un array directo de respuestas (formato muy antiguo)
              console.log('Restaurando respuestas con formato antiguo...');
              
              // Actualizar fullAnswersArray con las respuestas del formato antiguo
              progress.userAnswers.forEach((answer, index) => {
                if (answer && index < fullAnswersArray.length) {
                  const currentQuestion = formattedQuestions[index];
                  
                  fullAnswersArray[index] = {
                    ...fullAnswersArray[index],
                    selectedAnswer: answer,
                    isCorrect: answer === currentQuestion.answer || answer === currentQuestion.correctAnswer,
                    markedAsDoubt: markedAsDoubt[index] || false
                  };
                }
              });
              
              // Crear selectedAnswers para la UI
              const selectedMap = {};
              fullAnswersArray.forEach((answer, index) => {
                if (answer && answer.selectedAnswer) {
                  selectedMap[index] = answer.selectedAnswer;
                }
              });
              setSelectedAnswers(selectedMap);
            }
          } else if (progress.selectedAnswers) {
            // Si no hay userAnswers pero hay selectedAnswers (formato muy antiguo)
            console.log('Restaurando usando solo selectedAnswers (formato muy antiguo)...');
            
            setSelectedAnswers(progress.selectedAnswers);
            
            // Actualizar fullAnswersArray con las respuestas de selectedAnswers
            Object.entries(progress.selectedAnswers).forEach(([index, answer]) => {
              const questionIndex = parseInt(index);
              if (questionIndex < fullAnswersArray.length) {
                const currentQuestion = formattedQuestions[questionIndex];
                
                fullAnswersArray[questionIndex] = {
                  ...fullAnswersArray[questionIndex],
                  selectedAnswer: answer,
                  isCorrect: answer === currentQuestion.answer || answer === currentQuestion.correctAnswer,
                  markedAsDoubt: markedAsDoubt[questionIndex] || false
                };
              }
            });
          }
        }
        
        // Finalmente, establecer el array completo de userAnswers
        setUserAnswers(fullAnswersArray);
      }
      
      // Restaurar el tiempo restante
      if (typeof progress.timeLeft === 'number') {
          setTimeLeft(progress.timeLeft);
        console.log(`Tiempo restante restaurado: ${formatTime(progress.timeLeft)}`);
      }
      
      // Restaurar tiempo total
      if (typeof progress.totalTime === 'number') {
        setTotalTime(progress.totalTime);
      }
      
      // Restaurar pregunta actual
      if (typeof progress.currentQuestion === 'number') {
          setCurrentQuestion(progress.currentQuestion);
        console.log(`Pregunta actual restaurada: ${progress.currentQuestion + 1}`);
      }
      
      // Restaurar marcas de duda
      if (progress.markedAsDoubt) {
        // Manejar tanto formato de Map como de objeto
        if (typeof progress.markedAsDoubt === 'object') {
          const doubtMarks = {};
          
          // Si es un Map de MongoDB (formato { dataType: 'Map', value: {...} })
          if (progress.markedAsDoubt.dataType === 'Map' && progress.markedAsDoubt.value) {
            Object.entries(progress.markedAsDoubt.value).forEach(([key, value]) => {
              if (value === true) {
                doubtMarks[key] = true;
              }
            });
          } else {
            // Si es un objeto normal
            Object.entries(progress.markedAsDoubt).forEach(([key, value]) => {
              if (value === true) {
                doubtMarks[key] = true;
              }
            });
          }
          
          setMarkedAsDoubt(doubtMarks);
          console.log(`Restauradas ${Object.keys(doubtMarks).length} marcas de duda`);
        }
      }
      
      // Configurar el estado del examen
      if (progress.status) {
        if (progress.status === 'paused') {
          setPaused(true);
          console.log('Examen restaurado en estado pausado');
        } else {
          setPaused(false);
          console.log(`Examen restaurado en estado: ${progress.status}`);
        }
      }
      
      console.log('Progreso del examen restaurado correctamente');
      return true;
    } catch (error) {
      console.error('Error al recuperar progreso:', error);
      return false;
    }
  };

  // Usar loadQuestions en el useEffect
  useEffect(() => {
    // Si no hay modo específico y es simulacro, mostrar selector de tipo
    if (!examMode || examMode === 'simulacro') {
      // Si hay userId, intentar primero restaurar el progreso
      if (effectiveUserId) {
        resumeExam()
          .then(progressRestored => {
            // Si no se restauró progreso anterior, mostrar selector
            if (!progressRestored) {
              console.log('No hay progreso anterior, mostrando selector de tipo de examen');
              setShowExamTypeSelector(true);
            } else {
              // Si se restauró, verificar si hay preguntas
              // Si hay preguntas, no mostrar selector ni popup
              if (progressRestored.progress && progressRestored.progress.questions && progressRestored.progress.questions.length > 0) {
                console.log('Progreso restaurado con preguntas, ocultando selector');
                setShowExamTypeSelector(false);
                setShowStartPopup(false);
                setHasStarted(true);
              } else {
                console.log('Progreso restaurado pero sin preguntas, mostrando selector');
                setShowExamTypeSelector(true);
              }
            }
          })
          .catch(error => {
            console.error('Error al intentar restaurar el examen:', error);
            console.log('Error al restaurar, mostrando selector de tipo de examen');
            setShowExamTypeSelector(true);
          });
      } else {
        // Si no hay userId, mostrar selector
        console.log('No hay userId, mostrando selector de tipo de examen');
        setShowExamTypeSelector(true);
      }
    } else {
      // Si hay modo específico, cargar directamente
      console.log('Modo específico detectado, ocultando selector y cargando preguntas');
      setShowExamTypeSelector(false); // Asegurar que el selector no se muestre
      if (effectiveUserId) {
        resumeExam()
          .then(progressRestored => {
            // Si no se restauró progreso anterior o no hubo preguntas, cargar nuevas preguntas
            if (!progressRestored || (progressRestored.progress && (!progressRestored.progress.questions || progressRestored.progress.questions.length === 0))) {
              loadQuestions();
            } else {
              // Si se restauró, no mostrar popup de inicio
              setShowStartPopup(false);
              setHasStarted(true);
            }
          })
          .catch(error => {
            console.error('Error al intentar restaurar el examen:', error);
            loadQuestions();
          });
      } else {
        // Si no hay userId, simplemente cargar nuevas preguntas
        loadQuestions();
      }
    }
    // eslint-disable-next-line
  }, [examMode, effectiveUserId]);
  
  // Asegurarse de que el examen esté pausado al inicio
  useEffect(() => {
    setPaused(true);
  }, []);

  // Pausar el cronómetro mientras el popup está visible
  useEffect(() => {
    console.log('showStartPopup cambió:', showStartPopup);
    if (showStartPopup) {
      console.log('Pausando cronómetro - popup visible');
      setPaused(true);
    }
  }, [showStartPopup]);

  const handleStartExam = () => {
    console.log('Iniciando examen...');
    
    // Primero cerrar el popup
    setShowStartPopup(false);
    
    // Usar setTimeout para asegurarse de que el popup se ha cerrado antes de iniciar el cronómetro
    setTimeout(() => {
      setHasStarted(true); // Marcar que el examen ha comenzado
      setPaused(false); // Quitar la pausa
      console.log('Examen iniciado - Cronómetro activado');
    }, 100);
  };

  // Cuenta regresiva
  useEffect(() => {
    console.log('Cronómetro useEffect - isPaused:', isPaused, 'hasStarted:', hasStarted, 'timeLeft:', timeLeft);
    let timer;
    
    // Solo iniciar el cronómetro si el examen ha comenzado y no está pausado
    if (hasStarted && !isPaused && timeLeft > 0) {
      console.log('Iniciando cronómetro - condiciones cumplidas');
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else {
      console.log('Cronómetro no iniciado:', {
        hasStarted,
        isPaused,
        timeLeft,
        reason: !hasStarted ? 'no iniciado' : isPaused ? 'pausado' : 'tiempo agotado'
      });
    }
    
    return () => {
      if (timer) {
        console.log('Limpiando cronómetro');
        clearInterval(timer);
      }
    };
  }, [isPaused, hasStarted, timeLeft]);
  
  // Reemplazar saveExamProgress con la versión de utilities
  const saveExamProgressLocal = async (isCompleted = false, forcePauseState = null, forceStatus = null) => {
    try {
      console.log('==== INICIO GUARDADO DE PROGRESO ====');
      console.log(`UserID: ${effectiveUserId}`);
      console.log(`ExamID actual: ${examId || 'NUEVO'}`);
      console.log(`Preguntas: ${questions.length}, Respuestas: ${userAnswers.length}`);
      console.log(`Estado completado: ${isCompleted}, Pausa forzada: ${forcePauseState}, Estado forzado: ${forceStatus || 'no forzado'}`);

      // Establecer estado del examen (pausa forzada o estado actual)
      const currentPauseState = forcePauseState !== null ? forcePauseState : isPaused;
      // Si se proporciona un estado explícito, usarlo; de lo contrario, calcularlo como antes
      const examStatus = forceStatus || (currentPauseState ? 'paused' : (isCompleted ? 'completed' : 'in_progress'));
      
      // Calcular tiempo usado
      const timeUsedValue = Math.max(0, totalTime - timeLeft);
      
      console.log(`Guardando con estado: ${examStatus}, Tiempo usado: ${timeUsedValue}s`);
      
      // Obtener una copia actual del estado para asegurar que estamos enviando los datos más recientes
      // Incluso si el estado de React todavía no ha terminado de actualizarse
      const currentUserAnswers = [...userAnswers];
      const currentSelectedAnswers = {...selectedAnswers};
      const currentMarkedAsDoubt = {...markedAsDoubt};
      
      // Validar si tenemos respuestas válidas
      const validAnswersCount = currentUserAnswers.filter(a => 
        a && typeof a === 'object' && a.selectedAnswer
      ).length;
      
      console.log(`Respuestas válidas a guardar: ${validAnswersCount}/${currentUserAnswers.length}`);
      
      if (currentUserAnswers.length > 0) {
        // Mostrar ejemplo de la primera respuesta para depuración
        console.log('Ejemplo de respuesta:', JSON.stringify(currentUserAnswers[0], null, 2));
      }

      // DEPURACIÓN: Listar todas las respuestas (selectedAnswers) para verificar qué se está enviando
      console.log('Respuestas seleccionadas a enviar:', currentSelectedAnswers);
      console.log('Total de respuestas seleccionadas:', Object.keys(currentSelectedAnswers).length);
      
      // Llamar a la utilidad centralizada
      const result = await saveExamProgress(
        effectiveUserId,
        examId || null, // Pasar null explícitamente si no hay examId
        getExamTypeFromMode(examMode),
        questions,
        currentUserAnswers,  // Usar la copia actual del estado
        currentSelectedAnswers,  // Usar la copia actual del estado
        timeLeft,
        currentQuestion,
        currentMarkedAsDoubt,  // Usar la copia actual del estado
        timeUsedValue,
        totalTime,
        isCompleted,
        examStatus
      );
      
      // Verificar si recibimos un nuevo ID de examen
      if (result && result.examId) {
        if (!examId || examId !== result.examId) {
          console.log(`Recibido nuevo ID de examen: ${result.examId} (antiguo: ${examId || 'ninguno'})`);
          // Actualizar el ID de examen para futuros guardados
          setExamId(result.examId);
        } else {
          console.log(`Examen guardado con el mismo ID: ${result.examId}`);
        }
      }
      
      // Si hay error en el guardado, mostrar solo si es un error real
      if (result && result.error) {
        console.error('Error al guardar estado:', result.error);
        
        // No mostrar alerta si el mensaje indica que todo está bien
        if (!result.error.includes('progreso del examen') && 
            !result.error.toLowerCase().includes('todo esta bien')) {
          alert(`Error al guardar: ${result.error}`);
        }
        return result;
      } else {
        console.log('Guardado completado con éxito');
        setHasPendingChanges(false);
        return result;
      }
      
    } catch (error) {
      console.error('Error en saveExamProgress:', error);
      
      // No mostrar alerta si el mensaje indica que todo está bien
      const errorMsg = error.message || 'Error desconocido';
      if (!errorMsg.includes('progreso del examen') && 
          !errorMsg.toLowerCase().includes('todo esta bien')) {
        alert(`Error al guardar: ${errorMsg}`);
      }
      return { error: errorMsg };
    } finally {
      console.log('==== FIN GUARDADO DE PROGRESO ====');
    }
  };

  // Función para guardar progreso de forma optimizada
  const queueProgressSave = (isForceComplete = false) => {
    console.log(`===== INICIANDO PROCESO DE GUARDADO =====`);
    console.log(`Guardado forzado: ${isForceComplete}, Estado de guardado en progreso: ${isSaving}`);
    console.log(`Tiempo desde último guardado: ${Date.now() - lastSaveTime}ms`);
    
    // No guardar si el examen ya está finalizado o en proceso de finalización
    if (isSubmitted) {
      console.log('Examen ya finalizado o en proceso de finalización, omitiendo guardado');
      return;
    }
    
    // Marcar que hay cambios pendientes
    setHasPendingChanges(true);
    
    // Si es forzado (completado), guardar inmediatamente
    if (isForceComplete) {
      console.log('Ejecutando guardado forzado como completado');
      saveExamProgressLocal(true)
        .then(result => {
          if (result && result.error) {
            console.error('Error al guardar examen como completado:', result.error);
            
            // No mostrar alerta si el mensaje indica que todo está bien
            if (!result.error.includes('progreso del examen') && 
                !result.error.toLowerCase().includes('todo esta bien')) {
              alert(`Error al finalizar: ${result.error}`);
            }
          } else {
            console.log('Examen guardado como completado');
            setHasPendingChanges(false);
          }
        })
        .catch(error => {
          console.error('Error al finalizar examen:', error);
          alert(`Error al finalizar: ${error.message || 'Error desconocido'}`);
        });
      return;
    }
    
    // No guardar si ya hay un guardado en progreso
    if (isSaving) {
      console.log('Ya hay un guardado en progreso, omitiendo...');
      return;
    }
    
    // ELIMINADA LIMITACIÓN DE FRECUENCIA DE GUARDADO
    // Ahora permitimos guardar en cualquier momento sin importar cuándo fue el último guardado
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;
    console.log(`Tiempo desde último guardado: ${timeSinceLastSave}ms - Procediendo con el guardado`);
    
    // Si llegamos aquí, podemos guardar
    console.log('Condiciones cumplidas para guardar, procediendo...');
    setIsSaving(true);
    setLastSaveTime(now);
    
    // Guardar y resetear estado
    saveExamProgressLocal(false)
      .then(result => {
        if (result && result.error) {
          console.warn('Error al guardar progreso:', result.error);
          // Mantener la marca de cambios pendientes para un nuevo intento
        } else {
          console.log('Guardado completado con éxito');
          // Si obtuvimos un ID de examen, registrarlo
          if (result && result.examId) {
            console.log(`Guardado exitoso con ID: ${result.examId}`);
          }
          setHasPendingChanges(false);
        }
      })
      .catch(error => {
        console.error('Error durante el guardado:', error);
        // Mantener la marca de cambios pendientes para un nuevo intento
      })
      .finally(() => {
        setIsSaving(false);
        console.log('===== PROCESO DE GUARDADO FINALIZADO =====');
      });
  };

  // Usar efecto para guardar periódicamente si hay cambios pendientes
  useEffect(() => {
    let interval;
    
    // Solo configurar el guardado periódico si el examen está en progreso
    // y no ha sido finalizado/enviado
    if (timeLeft > 0 && !isSubmitted && !showStartPopup && !isPaused) {
      console.log('Configurando guardado periódico');
      
      // Verificar cada 60 segundos si debemos guardar (incluso sin cambios explícitos)
      interval = setInterval(() => {
        // Verificar nuevamente que el examen no haya sido finalizado
        if (!isSaving && !isSubmitted) {
          console.log('Guardado periódico programado');
          queueProgressSave();
        } else {
          console.log('Omitiendo guardado periódico: examen en proceso de guardado o finalizado');
        }
      }, 60000); // 60 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timeLeft, isSubmitted, showStartPopup, isPaused, isSaving]);

  // Función para agregar cambios al batch
  const addToBatch = (type, data) => {
    // Siempre que se modifique una respuesta, actualizar directamente userAnswers
    // para asegurar que se guarda el array completo
    if (type === 'answer') {
      // No es necesario hacer nada aquí, ya que userAnswers se actualiza directamente
      // en handleAnswerClick antes de llamar a addToBatch
    }
    
    // Marcar que hay cambios pendientes
    setHasPendingChanges(true);
    
    // Si es primera respuesta (sin examId aún), guardar inmediatamente
    // para obtener un ID y no depender del debounce
    if (!examId && type === 'answer') {
      console.log('Primera respuesta detectada, guardando inmediatamente para obtener ID');
      queueProgressSave();
      return;
    }
    
    // Programar un guardado debounced para el resto de los casos
    debouncedSave();
  };

  // Modificar handleAnswerClick para actualizar el objeto existente en lugar de crear uno nuevo
  const handleAnswerClick = (questionId, selectedOption) => {
    // Actualizar el estado selectedAnswers (para visualización)
    setSelectedAnswers((prevAnswers) => {
      const currentAnswer = prevAnswers[questionId];
      // Si ya está seleccionada, la quitamos
      if (currentAnswer === selectedOption) {
        const updatedAnswers = { ...prevAnswers };
        delete updatedAnswers[questionId];
        return updatedAnswers;
      }
      // Si no está seleccionada, la añadimos
      return { ...prevAnswers, [questionId]: selectedOption };
    });
    
    // Obtener la pregunta actual y el objeto de respuesta existente
    const currentQuestionData = questions[questionId];
    const existingAnswerObject = userAnswers[questionId];
    
    // Verificar si la respuesta es correcta
    let isCorrect = false;
    
    if (currentQuestionData) {
      // Caso 1: Si selectedOption es un número o string numérico, comparar directamente con answer
      if (!isNaN(selectedOption)) {
        isCorrect = parseInt(selectedOption) === parseInt(currentQuestionData.answer) ||
                   (currentQuestionData.correctAnswer && parseInt(selectedOption) === parseInt(currentQuestionData.correctAnswer));
      }
      // Caso 2: Si selectedOption es el texto completo de una opción
      else if (typeof selectedOption === 'string') {
        // Determinar si selectedOption es una de las opciones (option_1, option_2, etc.)
        if (selectedOption.startsWith('option_')) {
          const selectedIndex = parseInt(selectedOption.replace('option_', ''));
          isCorrect = selectedIndex === parseInt(currentQuestionData.answer) ||
                     (currentQuestionData.correctAnswer && selectedIndex === parseInt(currentQuestionData.correctAnswer));
        } 
        // Caso 3: Si selectedOption es el texto completo de la respuesta
        else {
          // Obtener el texto de la opción correcta
          const correctOptionKey = `option_${currentQuestionData.answer}`;
          const correctOptionText = currentQuestionData[correctOptionKey];
          
          // Comparar el texto seleccionado con el texto de la opción correcta
          isCorrect = selectedOption === correctOptionText;
          
          // Si hay un campo correctAnswer alternativo, también verificar con él
          if (!isCorrect && currentQuestionData.correctAnswer) {
            const altCorrectOptionKey = `option_${currentQuestionData.correctAnswer}`;
            const altCorrectOptionText = currentQuestionData[altCorrectOptionKey];
            isCorrect = selectedOption === altCorrectOptionText;
          }
        }
      }
    }
    
    console.log(`Respuesta seleccionada: ${selectedOption}, Respuesta correcta: ${currentQuestionData?.answer}, Es correcta: ${isCorrect}`);
    
    // Normalizar campo de imagen: usar 'image' si existe, sino 'imagen'
    let imageField = currentQuestionData?.image || currentQuestionData?.imagen || 
                     existingAnswerObject?.questionData?.image || 
                     existingAnswerObject?.questionData?.imagen || null;
    
    // Normalizar el nombre del archivo de imagen si existe
    if (imageField) {
      // Convertir a string y normalizar
      imageField = String(imageField).trim();
      
      // Si ya es una URL completa, no hacer más normalización
      if (imageField.startsWith('http://') || imageField.startsWith('https://')) {
        // Solo normalizar espacios en el nombre del archivo dentro de la URL
        try {
          const url = new URL(imageField);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];
          if (fileName) {
            const normalizedFileName = fileName.replace(/\s+/g, '_');
            pathParts[pathParts.length - 1] = normalizedFileName;
            url.pathname = pathParts.join('/');
            imageField = url.toString();
          }
        } catch (e) {
          // Si falla el parsing, solo normalizar espacios
          imageField = imageField.replace(/\s+/g, '_');
        }
      } else {
        // Si no es URL completa, normalizar
        imageField = imageField.replace(/\s+/g, '_');
        imageField = imageField.replace(/\/preguntas\//g, '/examen_fotos/');
      }
    }
    
    // Asegurarnos de que mantenemos la estructura completa del objeto de respuesta
    // CRÍTICO: Preservar el campo 'image' siguiendo la lógica del código antiguo
    const updatedAnswer = {
      questionId: existingAnswerObject?.questionId || currentQuestionData?._id,
      selectedAnswer: selectedOption,
      isCorrect: isCorrect,
      markedAsDoubt: existingAnswerObject?.markedAsDoubt || markedAsDoubt[questionId] || false,
      questionData: {
        // Si ya existe questionData, usarlo como base, sino crear uno nuevo
        ...(existingAnswerObject?.questionData || {}),
        // Asegurar que todos los campos estén presentes
        question: existingAnswerObject?.questionData?.question || currentQuestionData?.question || '',
        option_1: existingAnswerObject?.questionData?.option_1 || currentQuestionData?.option_1 || currentQuestionData?.options?.[0] || '',
        option_2: existingAnswerObject?.questionData?.option_2 || currentQuestionData?.option_2 || currentQuestionData?.options?.[1] || '',
        option_3: existingAnswerObject?.questionData?.option_3 || currentQuestionData?.option_3 || currentQuestionData?.options?.[2] || '',
        option_4: existingAnswerObject?.questionData?.option_4 || currentQuestionData?.option_4 || currentQuestionData?.options?.[3] || '',
        option_5: existingAnswerObject?.questionData?.option_5 || currentQuestionData?.option_5 || currentQuestionData?.options?.[4] || '-',
        answer: existingAnswerObject?.questionData?.answer || currentQuestionData?.answer || currentQuestionData?.correctAnswer || '',
        subject: existingAnswerObject?.questionData?.subject || currentQuestionData?.subject || currentQuestionData?.categoria || 'General',
        image: imageField || existingAnswerObject?.questionData?.image || null, // CRÍTICO: Preservar image siempre
        long_answer: existingAnswerObject?.questionData?.long_answer || currentQuestionData?.long_answer || ''
      }
    };
    
    // Verificar si updatedAnswer tiene long_answer
    if (updatedAnswer.questionData && !updatedAnswer.questionData.long_answer && currentQuestionData?.long_answer) {
      console.log(`Reparando long_answer para pregunta ${questionId}`);
      updatedAnswer.questionData.long_answer = currentQuestionData.long_answer;
    }
    
    // Actualizar userAnswers para guardar en BD manteniendo los datos completos
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionId] = updatedAnswer;
      return newAnswers;
    });

    // Agregar al batch en lugar de guardar inmediatamente
    addToBatch('answer', { questionId, answer: updatedAnswer });
  };

  // Handler for item selection from Pagination component
  const handleItemSelect = (index) => {
    setCurrentQuestion(index);
    // Calcular y establecer la página correcta
    const newPage = Math.floor(index / questionsPerPage);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
    // Optional: If clicking a number should always trigger save
    addToBatch('question', { newQuestion: index });
  };

  // Función para manejar el botón "Finalizar"
  const handleFinalizeClick = () => {
    // La nueva vista maneja el popup internamente
    // Esta función se pasará a ExamView como onFinalize
  };
        
  const handleDisputeSubmit = async (questionId) => {
    const disputeData = {
      question: questions[questionId]?.question || "Pregunta no disponible",
      reason: disputeReason,
      userAnswer: userAnswers[questionId] || null,
      userId: effectiveUserId
    };

    try {
      // Llamada al backend para enviar la impugnación por correo - corregida la ruta
      const response = await fetch(`${API_URL}/send-dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disputeData),
      });

      if (response.ok) {
        setSuccessMessage('Impugnación enviada');
        setShowSuccessNotification(true);
      } else {
        setSuccessMessage('Error al enviar impugnación');
        setShowSuccessNotification(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setSuccessMessage('Error al enviar impugnación');
      setShowSuccessNotification(true);
    } finally {
      // SIEMPRE cerrar el modal, sin importar si fue exitoso o no
      setIsDisputing(false);
      setDisputeReason('');
    }
  };

  // La función confirmFinalize es necesaria - debe mantenerse
  const confirmFinalize = async () => {
    try {
      if (!effectiveUserId) {
        alert('No se identificó al usuario');
        return;
      }

      // Prevenir guardados automáticos durante la finalización
      setIsSubmitted(true);
      setIsSaving(true);

      // Mostrar indicador de carga
      console.log('Finalizando examen...');

      // PASO CRUCIAL: Guardar los cambios pendientes primero
      if (hasPendingChanges) {
        try {
          const prevSaveResult = await saveExamProgressLocal(false);
          if (prevSaveResult?.error) {
            console.warn('Advertencia al guardar cambios previos:', prevSaveResult.error);
          }
        } catch (prevSaveError) {
          console.warn('Error al guardar cambios previos:', prevSaveError);
        }
      }

      const timeUsedValue = totalTime - timeLeft;
      const currentExamType = getExamTypeFromMode(examMode);
      
      // Verificar si las preguntas tienen long_answer
      console.log("======= VERIFICACIÓN DE PREGUNTAS ANTES DE FINALIZAR =======");
      if (questions && questions.length > 0) {
        const withLongAnswer = questions.filter(q => q.long_answer).length;
        console.log(`Preguntas con long_answer: ${withLongAnswer} de ${questions.length}`);
        console.log("Ejemplo de pregunta con long_answer:", questions.find(q => q.long_answer));
      }
      
      // Verificar si userAnswers tiene long_answer en questionData
      if (userAnswers && userAnswers.length > 0) {
        const withLongAnswerInQuestionData = userAnswers.filter(
          ua => ua && ua.questionData && ua.questionData.long_answer
        ).length;
        console.log(`userAnswers con long_answer en questionData: ${withLongAnswerInQuestionData} de ${userAnswers.length}`);
        
        if (withLongAnswerInQuestionData > 0) {
          console.log("Ejemplo de userAnswer con long_answer:", 
            userAnswers.find(ua => ua && ua.questionData && ua.questionData.long_answer));
        }
      }
      
      const result = await finalizeExam(
        effectiveUserId,
        currentExamType,
        questions,
        userAnswers,
        selectedAnswers,
        timeUsedValue,
        totalTime,
        markedAsDoubt,
        examId
      );
      
      if (result.error) {
        throw new Error(result.error);
      }

      console.log("===== RESPUESTA DEL BACKEND DESPUÉS DE FINALIZAR =====");
      console.log("ID del examen:", result.examId);
      
      // Verificar la estructura de la respuesta
      if (result.data) {
        console.log("Estructura de datos recibida:", Object.keys(result.data));
        
        // Si hay preguntas, verificar si tienen long_answer
        if (result.data.questions && result.data.questions.length > 0) {
          const withLongAnswer = result.data.questions.filter(q => q.long_answer).length;
          console.log(`Preguntas con long_answer en la respuesta: ${withLongAnswer} de ${result.data.questions.length}`);
          
          // Mostrar ejemplo de una pregunta con long_answer
          const example = result.data.questions.find(q => q.long_answer);
          if (example) {
            console.log("Ejemplo de pregunta con long_answer:", {
              question: example.question.substring(0, 30) + "...",
              long_answer: example.long_answer.substring(0, 30) + "..."
            });
          }
        }
      }
      console.log("=====  FIN RESPUESTA DEL BACKEND =====");

      // Mostrar notificación de éxito
      setSuccessMessage('¡Examen finalizado con éxito!');
      setShowSuccessNotification(true);

      // Esperar 2 segundos antes de redirigir
      setTimeout(() => {
        if (result.examId) {
          navigate(`/review/${result.examId}`);
        } else {
          navigate('/dashboard');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error en confirmFinalize:', error);
      // Solo mostrar alerta si es un error real, no si el examen se finalizó correctamente
      if (!error.message?.includes('se finalizó correctamente')) {
        alert(`Error al finalizar el examen: ${error.message || 'Error desconocido'}`);
      }
      setIsSaving(false);
      setIsSubmitted(false);
    }
  };

  // Formato de tiempo
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Modificar la función de pausar
  const handlePause = () => {
    // Simply toggle the pause state without saving
    setPaused(!isPaused);
  };

  // Modificar toggleDoubtMark para actualizar correctamente el estado
  const toggleDoubtMark = (questionIndex) => {
    setMarkedAsDoubt((prev) => {
      const isDubious = !prev[questionIndex];
      console.log(`Marcando pregunta ${questionIndex + 1} como ${isDubious ? 'duda' : 'normal'}`);
      
      // También actualizar la propiedad en userAnswers
      setUserAnswers(prevUserAnswers => {
        const newUserAnswers = [...prevUserAnswers];
        if (newUserAnswers[questionIndex]) {
          newUserAnswers[questionIndex] = {
            ...newUserAnswers[questionIndex],
            markedAsDoubt: isDubious
          };
        }
        return newUserAnswers;
      });
      
      // Agregar al batch en lugar de guardar inmediatamente
      addToBatch('doubt', { questionId: questionIndex, isDubious });
      return { ...prev, [questionIndex]: isDubious };
    });
  };

  // Replace renderCurrentQuestion with QuestionBox component
  const handleImpugnar = (questionId) => {
    setIsDisputing(true);
  };

  // Función para guardar manualmente
  const handleManualSave = () => {
    if (isSaving) {
      console.log('Ya hay un guardado en progreso...');
      return;
    }
    
    console.log('Guardando manualmente y finalizando con estado "en proceso"...');
    setIsSaving(true);
    
    // Calcular tiempo usado para enviar junto con el guardado
    const timeUsedValue = Math.max(0, totalTime - timeLeft);
    
    // Forzar guardado inmediato con feedback visual
    // Pasamos true como isCompleted para que ejecute la funcionalidad de finalizar
    // pero forzamos el estado a 'in_progress' en lugar de 'completed'
    saveExamProgressLocal(false, false, 'in_progress')
      .then(result => {
        if (result && result.error) {
          console.warn('Error al guardar manualmente:', result.error);
          alert(`Error al guardar: ${result.error}`);
        } else {
          console.log('Guardado y finalizado con estado "en proceso" completado con éxito');
          setHasPendingChanges(false);
          
          // Mostrar notificación visual de éxito
          setSuccessMessage('Guardado completado');
          setShowSuccessNotification(true);
        }
      })
      .catch(error => {
        console.error('Error durante el guardado manual:', error);
        alert(`Error al guardar: ${error.message || 'Error de conexión'}`);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // Uso al salir de la página - mejorado para asegurar un guardado correcto
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Intentar guardar sin esperar la respuesta
      if (!isSubmitted) {
        console.log('Usuario intentando salir de la página, guardando estado...');
        
        // Forzar un guardado síncrono (no podemos esperar promesas en beforeunload)
        const dataToSend = {
          userId: effectiveUserId,
          examId, 
          type: getExamTypeFromMode(examMode), 
          questions: questions.map(q => ({
            _id: q._id,
            question: q.question || '',
            option_1: q.option_1 || q.options?.[0] || '',
            option_2: q.option_2 || q.options?.[1] || '',
            option_3: q.option_3 || q.options?.[2] || '',
            option_4: q.option_4 || q.options?.[3] || '',
            option_5: q.option_5 || q.options?.[4] || '',
            answer: q.answer || q.correctAnswer || '',
            subject: q.subject || q.categoria || 'General',
            image: q.image || null
          })),
          // userAnswers ya está en el formato nuevo, lo enviamos directamente
          userAnswers,
          selectedAnswers,
          timeLeft,
          currentQuestion,
          markedAsDoubt,
          timeUsed: totalTime - timeLeft,
          totalTime,
          completed: false,
          status: 'paused',
          totalQuestions: questions.length
        };
        
        // Realizar una solicitud síncrona (deprecated pero necesario para este caso)
        const xhr = new XMLHttpRequest();
        const saveURL = `${API_URL}/save-exam-progress`;
        xhr.open('POST', saveURL, false); // false = síncrono
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
          xhr.send(JSON.stringify(dataToSend));
          console.log('Estado guardado antes de salir');
        } catch (err) {
          console.error('Error al guardar estado antes de salir:', err);
        }
        
        // Mostrar mensaje al usuario
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar. ¿Seguro que quieres salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted, effectiveUserId, examId, questions, userAnswers, selectedAnswers, timeLeft, currentQuestion, markedAsDoubt, totalTime, examType, examMode]);

  // Add helper function to generate item status for Pagination
  const generateItemStatus = () => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      if (markedAsDoubt[i]) {
        status[i] = 'doubt';
      } else if (selectedAnswers[i] || (userAnswers[i] && 
                 (typeof userAnswers[i] === 'object' ? 
                  userAnswers[i].selectedAnswer : 
                  userAnswers[i]))) {
        status[i] = 'answered';
      }
    }
    return status;
  };

  // Manejar navegación de preguntas desde ExamView
  const handleNavigate = (index) => {
    setCurrentQuestion(index);
    // Calcular y establecer la página correcta
    const newPage = Math.floor(index / questionsPerPage);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
    // Marcar cambios pendientes
    addToBatch('question', { newQuestion: index });
  };

  // Renderizar selector de tipo de simulacro si es necesario (ANTES de otras verificaciones)
  // IMPORTANTE: Verificar esto primero para evitar que la página quede en blanco
  console.log('🔍 Renderizando Exam - showExamTypeSelector:', showExamTypeSelector, 'examMode:', examMode, 'questions.length:', questions?.length || 0, 'isLoading:', isLoading);
  
  if (showExamTypeSelector && (!examMode || examMode === 'simulacro')) {
    console.log('✅ Mostrando selector de tipo de examen');
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}>
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>
            <strong>Elige tu tipo de simulacro EIR</strong>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => handleSimulacroTypeSelect('anteriores')}
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                border: '2px solid #7ea0a7',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                textAlign: 'left',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e9ecef';
                e.target.style.borderColor = '#5a8a6a';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.borderColor = '#7ea0a7';
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                Examen EIR Años Anteriores
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                200 preguntas • 10 imágenes • 4 horas y 30 minutos
              </div>
            </button>
            
            <button
              onClick={() => handleSimulacroTypeSelect('protocolos')}
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                border: '2px solid #7ea0a7',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                textAlign: 'left',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e9ecef';
                e.target.style.borderColor = '#5a8a6a';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.borderColor = '#7ea0a7';
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                Examen de Protocolos
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                200 preguntas • 4 horas y 30 minutos
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. Mejorar el manejo de errores general
  if (isError) {
    return (
      <ErrorDisplay 
        onRetry={loadQuestions}
        onReturn={() => navigate('/dashboard')}
      />
    );
  }

  // Si está cargando, mostrar indicador
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Cargando examen...</div>
      </div>
    );
  }

  // Si no hay preguntas aún y no estamos en el selector, mostrar mensaje en lugar de null
  if ((!questions || questions.length === 0) && !showExamTypeSelector && !isLoading) {
    console.log('⚠️ No hay preguntas, no hay selector, y no está cargando - mostrando mensaje');
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Preparando examen...</div>
        <button 
          onClick={() => {
            console.log('Forzando mostrar selector');
            setShowExamTypeSelector(true);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#7ea0a7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Seleccionar tipo de examen
        </button>
      </div>
    );
  }

  // Renderizar popup de inicio si es necesario
  if (showStartPopup) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}>
          {examMode === 'errors' ? (
            <>
              <h2><strong>¡Comienza tu repaso de errores!</strong></h2>
              <p>
                Este examen consta de <strong>{questions.length} preguntas</strong> seleccionadas 
                de tus errores anteriores. Dispones de <strong>{formatTime(timeLeft)}</strong> para 
                completarlo. Administra bien tu tiempo y recuerda que puedes revisar y ajustar 
                tus respuestas antes de finalizar.
              </p>
            </>
          ) : selectedSimulacroType === 'anteriores' ? (
            <>
              <h2><strong>¡Comienza tu simulacro EIR!</strong></h2>
              <p>
                Este examen consta de <strong>200 preguntas</strong> y dispones de 
                <strong> 4 horas y 30 minutos</strong> para completarlo. De estas preguntas, 
                <strong> 10 incluyen imágenes</strong>. Administra bien tu tiempo y recuerda 
                que puedes revisar y ajustar tus respuestas antes de finalizar.
              </p>
            </>
          ) : selectedSimulacroType === 'protocolos' ? (
            <>
              <h2><strong>¡Comienza tu examen de protocolos!</strong></h2>
              <p>
                Este examen consta de <strong>200 preguntas</strong> y dispones de 
                <strong> 4 horas y 30 minutos</strong> para completarlo. Administra bien tu tiempo 
                y recuerda que puedes revisar y ajustar tus respuestas antes de finalizar.
              </p>
            </>
          ) : (
            <>
              <h2><strong>¡Comienza tu simulacro!</strong></h2>
              <p>
                Este examen consta de <strong>210 preguntas</strong> y dispones de 
                <strong> 4 horas y 30 minutos</strong> para completarlo. De estas preguntas, 
                <strong> 10 incluyen imágenes</strong>. Administra bien tu tiempo y recuerda 
                que puedes revisar y ajustar tus respuestas antes de finalizar.
              </p>
            </>
          )}
          <button 
            onClick={handleStartExam} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#7ea0a7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Estoy list@
          </button>
        </div>
      </div>
    );
  }

  // Renderizar la nueva vista de examen
  return (
    <>
      <ExamView
        questions={questions}
        userAnswers={userAnswers}
        handleAnswerClick={handleAnswerClick}
        markedAsDoubt={markedAsDoubt}
        toggleDoubtMark={toggleDoubtMark}
        onSave={handleManualSave}
        onFinalize={confirmFinalize}
        onPause={handlePause}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: `Examen: ${getExamTypeFromMode(examMode).toUpperCase()}`,
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(totalTime / 60),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: `examen-${getExamTypeFromMode(examMode)}.pdf`
        })}
        onExit={() => navigate('/dashboard')}
        timeLeft={timeLeft}
        totalTime={totalTime}
        isPaused={isPaused}
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        examType={getExamTypeFromMode(examMode)}
        isReviewMode={false}
        disabledButtons={[]}
        isDarkMode={isDarkMode}
        currentQuestion={currentQuestion}
        onNavigate={handleNavigate}
        onImpugnarSubmit={async (questionId, reason) => {
          setDisputeReason(reason);
          await handleDisputeSubmit(questionId);
        }}
      />

      {showSuccessNotification && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setShowSuccessNotification(false)}
          autoCloseTime={successMessage.includes('Impugnación') ? 1500 : 1000}
        />
      )}
    </>
  );
}

export default Exam;
