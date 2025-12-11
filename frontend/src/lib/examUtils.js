/**
 * Utilidades para el manejo de exámenes
 * Estas funciones pueden ser utilizadas por cualquier componente que necesite interactuar con exámenes
 */

/**
 * Finaliza un examen enviando los datos al backend para su validación y almacenamiento
 * @param {string} userId - ID del usuario que realizó el examen
 * @param {string} examType - Tipo de examen (simulacro, errores, protocolos, contrarreloj, quizz, aeleccion)
 * @param {Array} questions - Array de preguntas del examen
 * @param {Array} userAnswers - Array de respuestas del usuario en formato nuevo con questionId, selectedAnswer, isCorrect y questionData
 * @param {Object} selectedAnswers - Objeto con las respuestas seleccionadas por índice
 * @param {number} timeUsed - Tiempo utilizado en segundos
 * @param {number} totalTime - Tiempo total asignado en segundos
 * @param {Object} markedAsDoubt - Objeto que indica qué preguntas están marcadas como duda
 * @param {string} examId - ID del examen si ya existe, undefined si es nuevo
 * @returns {Promise} - Promesa que resuelve con los resultados del examen o un error
 */
export const finalizeExam = async (userId, examType, questions, userAnswers, selectedAnswers, timeUsed, totalTime, markedAsDoubt, examId = null) => {
  try {
    console.log(`Finalizando examen tipo: ${examType}`);
    
    if (!userId) {
      return { error: 'No se identificó al usuario' };
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return { error: 'Las preguntas no son válidas o están vacías' };
    }

    // Validar formato de userAnswers
    const isNewFormat = Array.isArray(userAnswers) && 
                        userAnswers.length > 0 && 
                        userAnswers.some(answer => answer && typeof answer === 'object' && answer.questionData);
    
    console.log(`Formato de respuestas detectado: ${isNewFormat ? 'nuevo' : 'antiguo'}`);

    // Log detallado de userAnswers para depuración
    console.log('----------- DETALLE DE DATOS ENVIADOS AL FINALIZAR EXAMEN -----------');
    console.log(`Total de preguntas: ${questions.length}`);
    console.log(`Total de respuestas en userAnswers: ${userAnswers.length}`);
    console.log(`Tipo de examen: ${examType}`);
    console.log(`Tiempo usado: ${timeUsed} segundos`);
    console.log(`ExamID: ${examId || 'NUEVO'}`);
    
    // Mostrar ejemplo de estructura de userAnswers (primera respuesta)
    if (userAnswers.length > 0) {
      console.log('Ejemplo de estructura de userAnswers (primera respuesta):', JSON.stringify(userAnswers[0], null, 2));
      
      // Contar respuestas contestadas
      const answeredCount = userAnswers.filter(answer => 
        answer && (
          (isNewFormat && answer.selectedAnswer !== undefined && answer.selectedAnswer !== null) || 
          (!isNewFormat && answer !== null && answer !== undefined)
        )
      ).length;
      
      console.log(`Total de preguntas contestadas: ${answeredCount}`);
    }
    console.log('----------- FIN DETALLE -----------');
    
    // Preparar los datos para enviar al backend
    const dataToSend = {
      userId: userId,
      examType: examType,
      questions: questions.map(q => ({
        _id: q._id,
        question: q.question || '',
        option_1: q.option_1 || q.options?.[0] || '',
        option_2: q.option_2 || q.options?.[1] || '',
        option_3: q.option_3 || q.options?.[2] || '',
        option_4: q.option_4 || q.options?.[3] || '',
        option_5: q.option_5 || q.options?.[4] || '-',
        answer: q.answer || '',
        subject: q.subject || q.categoria || 'General',
        long_answer: q.long_answer || ''
      })),
      userAnswers: userAnswers.map(answer => {
        if (answer && answer.questionData) {
          return {
            ...answer,
            questionData: {
              ...answer.questionData,
              long_answer: answer.questionData.long_answer || 
                          questions.find(q => q._id === answer.questionId)?.long_answer || ''
            }
          };
        }
        return answer;
      }),
      selectedAnswers: selectedAnswers,
      timeUsed: timeUsed,
      totalTime: totalTime,
      markedAsDoubt: markedAsDoubt,
      completed: true,
      status: 'completed',
      totalQuestions: questions.length,
      isExplicitFinalization: true
    };
    
    // Si hay un ID de examen, incluirlo para actualizar en lugar de crear nuevo
    if (examId) {
      dataToSend.examId = examId;
      console.log(`Finalizando examen existente con ID: ${examId}`);
    } else {
      console.log('Creando nuevo examen completado (sin ID previo)');
    }
    
    console.log(`Enviando examen tipo ${examType} para validación. Total preguntas: ${questions.length}`);
    
    // Añadir logs detallados sobre los datos que se envían
    console.log('----------- DATOS DEL EXAMEN ENVIADOS AL BACKEND -----------');
    console.log(`Cantidad de preguntas enviadas al backend: ${dataToSend.questions.length}`);
    console.log(`Formato de userAnswers:`, typeof userAnswers, Array.isArray(userAnswers) ? userAnswers.length : 'no es array');
    console.log(`Formato de respuestas de usuario: ${isNewFormat ? 'Nuevo formato con questionData' : 'Formato anterior'}`);
    console.log(`Formato de selectedAnswers:`, typeof selectedAnswers, Object.keys(selectedAnswers).length);
    
    // Log detallado de las primeras 3 preguntas para ver si incluyen long_answer
    console.log('MUESTRA DE PREGUNTAS ENVIADAS:');
    for (let i = 0; i < Math.min(3, dataToSend.questions.length); i++) {
      const q = dataToSend.questions[i];
      console.log(`Pregunta ${i+1}:`, {
        id: q._id,
        pregunta: q.question.substring(0, 30) + '...',
        respuesta_correcta: q.answer,
        long_answer: q.long_answer ? `${q.long_answer.substring(0, 30)}...` : 'NO TIENE',
        subject: q.subject
      });
    }
    
    // Log detallado de las primeras 3 respuestas del usuario
    console.log('MUESTRA DE RESPUESTAS DEL USUARIO:');
    for (let i = 0; i < Math.min(3, dataToSend.userAnswers.length); i++) {
      const a = dataToSend.userAnswers[i];
      if (a && typeof a === 'object') {
        console.log(`Respuesta ${i+1}:`, {
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer,
          isCorrect: a.isCorrect,
          markedAsDoubt: a.markedAsDoubt,
          tiene_questionData: !!a.questionData,
          tiene_long_answer: a.questionData ? !!a.questionData.long_answer : false,
          long_answer: a.questionData && a.questionData.long_answer 
            ? `${a.questionData.long_answer.substring(0, 30)}...` 
            : 'NO TIENE'
        });
      } else {
        console.log(`Respuesta ${i+1}: formato no esperado`, a);
      }
    }
    
    console.log('----------- FIN DATOS ENVIADOS -----------');
    
    // Crear una promesa con un timeout para abortar si tarda demasiado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    try {
      // FORZAR URL DE PRODUCCIÓN SI ESTAMOS EN SIMULIA.ES
      const isProduction = typeof window !== 'undefined' && 
        (window.location.hostname === 'www.simulia.es' || 
         window.location.hostname === 'simulia.es' ||
         window.location.protocol === 'https:');
      
      const apiUrl = isProduction ? 'https://social-emmi-simulia-845ca5f1.koyeb.app' : 'http://localhost:5001';
      console.log('🔧 EXAMUTILS DEBUG - isProduction:', isProduction, 'apiUrl:', apiUrl);
      
      const response = await fetch(`${apiUrl}/validate-and-save-exam`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(dataToSend),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Si el servidor devuelve un error, intentar obtener el mensaje
        let errorMessage = 'Error al procesar el examen';
        try {
          const errorResponse = await response.text();
          console.error('Respuesta de error:', errorResponse);
          
          try {
            const errorData = JSON.parse(errorResponse);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (jsonError) {
            errorMessage = errorResponse || errorMessage;
          }
        } catch (textError) {
          console.error('Error al leer respuesta de error:', textError);
        }
        
        console.error(`Error al finalizar examen (${response.status}):`, errorMessage);
        return { error: errorMessage };
      }

      // Procesar la respuesta exitosa
      const data = await response.json();
      console.log('Examen finalizado con éxito:', data);
      console.log('ID del examen registrado:', data.examId);
      
      // Añadir logs sobre la respuesta del backend
      console.log('----------- RESPUESTA DEL BACKEND -----------');
      if (data.results) {
        console.log(`Estadísticas: Correctas: ${data.results.correct}, Incorrectas: ${data.results.incorrect}, En blanco: ${data.results.blank}`);
        console.log(`Puntuación: ${data.results.score}`);
        console.log(`Cantidad de questionResults recibidos: ${data.results.questionResults ? data.results.questionResults.length : 0}`);
      }
      console.log('----------- FIN RESPUESTA -----------');
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('Timeout al finalizar examen - la solicitud tardó demasiado');
        return { error: 'Timeout al finalizar examen' };
      }
      
      console.error('Error en la petición:', error);
      return { error: error.message || 'Error al conectar con el servidor' };
    }
  } catch (error) {
    console.error('Error general al finalizar examen:', error);
    return { error: error.message || 'Error desconocido al finalizar examen' };
  }
};



export const resumeExam = async (userId) => {
  try {
    console.log(`Intentando recuperar progreso del examen para usuario ${userId}...`);
    
    // FORZAR URL DE PRODUCCIÓN SI ESTAMOS EN SIMULIA.ES
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname === 'www.simulia.es' || 
       window.location.hostname === 'simulia.es' ||
       window.location.protocol === 'https:');
    
    const apiUrl = isProduction ? 'https://social-emmi-simulia-845ca5f1.koyeb.app' : 'http://localhost:5001';
    console.log('🔧 EXAMUTILS DEBUG - resumeExam isProduction:', isProduction, 'apiUrl:', apiUrl);
    
    const response = await fetch(`${apiUrl}/get-exam-progress/${userId}`);
    
    if (!response.ok) {
      console.error(`Error al obtener progreso (${response.status})`);
      return false;
    }
    
    const data = await response.json();
    
    // Verificar si hay progreso disponible
    if (!data || !data.progress) {
      console.log('No se encontró progreso anterior');
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Error al recuperar progreso:', error);
    return false;
  }
};

/**
 * Determina el tipo de examen basado en el modo
 * @param {string} mode - Modo de examen desde los parámetros de URL
 * @returns {string} - Tipo de examen normalizado para el backend
 */
export const getExamType = (mode) => {
  switch (mode) {
    case 'errors':
      return 'errores';
    case 'protocol':
      return 'protocolos';
    case 'timed':
      return 'contrarreloj';
    case 'quizz':
      return 'quizz';
    case 'custom':
      return 'aeleccion';
    case 'scales':
      return 'escalas';
    default:
      return 'simulacro';
  }
}; 


/**
 * Guarda el progreso de un examen en curso para poder continuarlo más tarde
 * @param {string} userId - ID del usuario que está realizando el examen
 * @param {string} examId - ID del examen si ya existe, undefined si es nuevo
 * @param {string} examType - Tipo de examen (simulacro, errores, protocolos, contrarreloj, quizz, aeleccion)
 * @param {Array} questions - Array de preguntas del examen
 * @param {Array} userAnswers - Array de respuestas del usuario en formato nuevo con questionId, selectedAnswer, isCorrect y questionData
 * @param {Object} selectedAnswers - Objeto con las respuestas seleccionadas por índice
 * @param {number} timeLeft - Tiempo restante en segundos
 * @param {number} currentQuestion - Índice de la pregunta actual
 * @param {Object} markedAsDoubt - Objeto que indica qué preguntas están marcadas como duda
 * @param {number} timeUsed - Tiempo utilizado en segundos
 * @param {number} totalTime - Tiempo total asignado en segundos
 * @param {boolean} isCompleted - Indica si el examen está completado
 * @param {string} examStatus - Estado del examen (in_progress, paused, completed)
 * @returns {Promise} - Promesa que resuelve con los resultados del examen o un error
 */
export const saveExamProgress = async (
  userId, 
  examId,
  examType, 
  questions, 
  userAnswers, 
  selectedAnswers, 
  timeLeft,
  currentQuestion,
  markedAsDoubt,
  timeUsed, 
  totalTime, 
  isCompleted,
  examStatus,
  simulacroSourceType = null
) => {
  try {
    console.log(`Guardando progreso de examen tipo: ${examType}`);
    
    if (!userId) {
      return { error: 'No se identificó al usuario' };
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return { error: 'Las preguntas no son válidas o están vacías' };
    }

    // Si está completado, verificar que no se esté llamando innecesariamente
    // Esto podría indicar un doble guardado durante la finalización
    if (isCompleted || examStatus === 'completed') {
      console.log('ATENCIÓN: saveExamProgress llamado con isCompleted=true o status=completed');
      console.log('Esto podría indicar un intento de doble guardado durante la finalización.');
      console.log('Para finalizar un examen, se debe usar finalizeExam directamente.');
      
      // Si ya existe un ID de examen y está marcado como completado,
      // podría tratarse de un doble guardado - advertir pero continuar
      if (examId) {
        console.log(`El examen ya tiene ID (${examId}) y se está guardando como completado.`);
        console.log('Se continuará con el guardado pero esto podría causar duplicados.');
      }
    }

    // Validar formato de userAnswers
    const isNewFormat = Array.isArray(userAnswers) && 
                        userAnswers.length > 0 && 
                        userAnswers.some(answer => answer && typeof answer === 'object' && answer.questionData);
    
    console.log(`Formato de respuestas detectado: ${isNewFormat ? 'nuevo' : 'antiguo'}`);

    // Log detallado de userAnswers para depuración
    console.log('----------- DETALLE DE DATOS ENVIADOS AL GUARDAR PROGRESO -----------');
    console.log(`Total de preguntas: ${questions.length}`);
    console.log(`Total de respuestas en userAnswers: ${userAnswers.length}`);
    console.log(`Tipo de examen: ${examType}`);
    console.log(`Tiempo usado: ${timeUsed} segundos`);
    console.log(`Tiempo restante: ${timeLeft} segundos`);
    console.log(`Pregunta actual: ${currentQuestion}`);
    console.log(`Estado del examen: ${examStatus}`);
    
    // Mostrar ejemplo de estructura de userAnswers (primera respuesta)
    if (userAnswers.length > 0) {
      console.log('Ejemplo de estructura de userAnswers (primera respuesta):', JSON.stringify(userAnswers[0], null, 2));
      
      // Contar respuestas contestadas
      const answeredCount = userAnswers.filter(answer => 
        answer && (
          (isNewFormat && answer.selectedAnswer !== undefined && answer.selectedAnswer !== null) || 
          (!isNewFormat && answer !== null && answer !== undefined)
        )
      ).length;
      
      console.log(`Total de preguntas contestadas: ${answeredCount}`);
    }
    console.log('----------- FIN DETALLE DE DATOS ENVIADOS -----------');

    // Preparar los datos para enviar al backend
    const examData = {
      type: examType,
      questions: questions.map(q => ({
        _id: q._id,
        question: q.question || '',
        option_1: q.option_1 || q.options?.[0] || '',
        option_2: q.option_2 || q.options?.[1] || '',
        option_3: q.option_3 || q.options?.[2] || '',
        option_4: q.option_4 || q.options?.[3] || '',
        option_5: q.option_5 || q.options?.[4] || '',
        answer: q.answer || '',
        subject: q.subject || '',
        image: q.image || null,
        long_answer: q.long_answer || ''
      })),
      userAnswers: userAnswers,
      selectedAnswers: selectedAnswers,
      timeUsed: timeUsed,
      timeLeft: timeLeft,
      totalTime: totalTime,
      currentQuestion: currentQuestion,
      markedAsDoubt: markedAsDoubt,
      status: examStatus || 'in_progress',
      totalQuestions: questions.length
    };
    
    // Agregar simulacroSourceType si está disponible (solo para simulacros)
    if (simulacroSourceType && examType === 'simulacro') {
      examData.simulacroSourceType = simulacroSourceType;
    }

    // Solo añadir examId si está definido y no es null
    if (examId) {
      examData.examId = examId;
    } else {
      console.log('Creando un nuevo examen (sin ID)');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    try {
      // Para el usuario de prueba, usar un ID específico que el backend pueda reconocer
      const effectiveUserId = userId;
      
      // FORZAR URL DE PRODUCCIÓN SI ESTAMOS EN SIMULIA.ES
      const isProduction = typeof window !== 'undefined' && 
        (window.location.hostname === 'www.simulia.es' || 
         window.location.hostname === 'simulia.es' ||
         window.location.protocol === 'https:');
      
      const apiUrl = isProduction ? 'https://social-emmi-simulia-845ca5f1.koyeb.app' : 'http://localhost:5001';
      console.log('🔧 EXAMUTILS DEBUG - saveExamProgress isProduction:', isProduction, 'apiUrl:', apiUrl);
      
      const response = await fetch(`${apiUrl}/validate-and-save-exam-in-progress`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          userId: effectiveUserId,
          examData
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Si el servidor devuelve un error, intentar obtener el mensaje
        let errorMessage = 'Error al guardar progreso del examen';
        try {
          const errorResponse = await response.text();
          console.error('Respuesta de error:', errorResponse);
          
          try {
            const errorData = JSON.parse(errorResponse);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (jsonError) {
            errorMessage = errorResponse || errorMessage;
          }
        } catch (textError) {
          console.error('Error al leer respuesta de error:', textError);
        }
        
        console.error(`Error al guardar progreso (${response.status}):`, errorMessage);
        return { error: errorMessage };
      }

      // Procesar la respuesta exitosa
      const data = await response.json();
      console.log('Progreso guardado con éxito:', data);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('Timeout al guardar progreso - la solicitud tardó demasiado');
        return { error: 'Timeout al guardar progreso del examen' };
      }
      
      console.error('Error en la petición:', error);
      return { error: error.message || 'Error al conectar con el servidor' };
    }
  } catch (error) {
    console.error('Error general al guardar progreso del examen:', error);
    return { error: error.message || 'Error desconocido al guardar progreso' };
  }
};