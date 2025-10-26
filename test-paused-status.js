const axios = require('axios');
const mongoose = require('mongoose');

async function testPausedStatus() {
  try {
    console.log('🧪 Probando el endpoint con estado "paused"...');
    
    const testData = {
      userId: 'test_user_1',
      examData: {
        type: 'protocolos',
        userAnswers: [
          {
            questionId: new mongoose.Types.ObjectId(),
            selectedAnswer: 'A',
            isCorrect: null,
            markedAsDoubt: false,
            questionData: {
              question: 'Pregunta de prueba',
              option_1: 'Opción A',
              option_2: 'Opción B',
              option_3: 'Opción C',
              option_4: 'Opción D',
              answer: 'A',
              subject: 'General'
            }
          }
        ],
        timeUsed: 120,
        totalTime: 1800,
        status: 'paused', // Este es el valor que estaba causando el error
        currentQuestion: 0,
        timeLeft: 1680
      }
    };

    const response = await axios.post('http://localhost:5001/validate-and-save-exam-in-progress', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ ¡Éxito! El endpoint acepta el estado "paused"');
    console.log('📊 Respuesta del servidor:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error del servidor:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error de conexión:', error.message);
    }
  }
}

testPausedStatus();
