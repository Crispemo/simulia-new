import React, { useState } from 'react';
import { X, Heart, MessageSquare, Lightbulb, Send } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function SurveyModal({ isOpen, onClose, isDarkMode }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'anonymous';
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const questions = [
    {
      id: 'exam_years',
      type: 'radio',
      title: '¿Desde qué año te gustaría que estén disponibles los exámenes EIR para poder practicar?',
      required: true,
      options: [
        'A partir del 2000',
        'A partir del 2010',
        'A partir de 2015',
        'Sólo últimos 5 años',
        'Cuantos más años, mejor (me da igual el punto de inicio)'
      ]
    },
    {
      id: 'practice_types',
      type: 'checkbox',
      title: '¿Qué tipo de prácticas valoras más?',
      required: true,
      options: [
        'Pruebas tipo quiz rápidas',
        'Test por asignaturas',
        'Test protocolos (tipo EIR actualizados con bibliografía reciente)',
        'Preguntas EIR oficiales año a año',
        'Repetición de mis errores'
      ],
      allowOther: true
    },
    {
      id: 'comparison',
      type: 'radio',
      title: '¿Te gustaría poder compararte con otros usuarios de Simulia?',
      required: true,
      options: [
        'Sí, me motivaría ver cómo voy respecto al resto',
        'No, prefiero centrarme sólo en mi evolución y estadísticas'
      ]
    },
    {
      id: 'test_techniques',
      type: 'radio',
      title: '¿Te interesa que Simulia incluya consejos o técnicas para responder mejor a tipo test?',
      required: true,
      options: [
        'Sí, me vendría genial aprender estrategia tipo test',
        'No, no siento que me haga falta'
      ]
    },
    {
      id: 'technique_format',
      type: 'radio',
      title: '¿En qué formato preferirías aprender esa técnica tipo test?',
      required: false,
      options: [
        'Consejos prácticos en formato texto (PDF)',
        'Pequeños vídeos explicativos',
        'No me interesa por ahora'
      ]
    },
    {
      id: 'new_features',
      type: 'textarea',
      title: '¿Hay alguna funcionalidad o mejora que te gustaría ver próximamente en Simulia?',
      required: false,
      placeholder: 'Cuéntanos tus ideas... ¡Todas las sugerencias son bienvenidas!'
    },
    {
      id: 'best_worst',
      type: 'textarea',
      title: '¿Qué parte de Simulia valoras más, pero crees que aún podría mejorar?',
      required: false,
      placeholder: 'Dinos qué te encanta y qué podríamos pulir...',
      subtitle: 'Puede ser algo que ya te encante, pero que crees que aún tiene margen para pulirse (como los simulacros, la repetición de errores, las explicaciones...) y que debería de mejorar.'
    },
    {
      id: 'bugs',
      type: 'textarea',
      title: '¿Has tenido algún fallo en la plataforma?',
      required: false,
      placeholder: 'Si has experimentado algún problema técnico, cuéntanoslo para poder solucionarlo.'
    },
    {
      id: 'comments',
      type: 'textarea',
      title: '¿Algún comentario, sugerencia o idea que quieras compartir conmigo?',
      required: false,
      placeholder: 'Todo lo que me cuentes me ayuda a construir algo realmente útil para ti y quienes se preparan el EIR.',
      subtitle: '¡Todo lo que me cuentes me ayuda a construir algo realmente útil para ti y quienes se preparan el EIR!'
    },
    {
      id: 'recommendation',
      type: 'rating',
      title: '¿Recomendarías Simulia a otros opositores desde la experiencia que has tenido?',
      required: true,
      min: 1,
      max: 5,
      labels: {
        1: 'Definitivamente NO',
        2: 'Probablemente no',
        3: 'Tal vez',
        4: 'Probablemente sí',
        5: '¡Claro que sí!'
      }
    }
  ];

  const totalSteps = questions.length;

  const handleInputChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [option]: checked
      }
    }));
  };

  const handleOtherChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        other: value
      }
    }));
  };

  const canProceed = () => {
    const currentQuestion = questions[currentStep];
    if (!currentQuestion.required) return true;

    const response = responses[currentQuestion.id];

    if (currentQuestion.type === 'radio') {
      return response && response.trim() !== '';
    }

    if (currentQuestion.type === 'checkbox') {
      const checkedOptions = Object.values(response || {}).filter(Boolean);
      return checkedOptions.length > 0;
    }

    if (currentQuestion.type === 'rating') {
      return response !== undefined && response !== null;
    }

    return true; // Para textarea, no requerido por defecto
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Enviar respuestas al backend
      const response = await fetch(`${API_URL}/api/survey/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          responses,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar las respuestas');
      }

      // Mostrar confirmación mejorada
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm';
      successMessage.innerHTML = `
        <div class="bg-card border border-border rounded-lg shadow-xl p-8 max-w-md text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-2xl font-bold mb-2">¡Gracias por tu feedback!</h3>
          <p class="text-muted-foreground mb-6">
            Tu opinión es súper valiosa para mejorar Simulia. ¡Cada sugerencia cuenta! 💝
          </p>
          <button 
            onclick="this.closest('.fixed').remove()"
            class="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            ¡Genial!
          </button>
        </div>
      `;
      document.body.appendChild(successMessage);

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        successMessage.remove();
        onClose();
        // Reset form
        setResponses({});
        setCurrentStep(0);
      }, 2000);

    } catch (error) {
      console.error('Error al enviar la encuesta:', error);
      // Si falla el backend, guardar localmente como fallback
      localStorage.setItem(`survey_responses_${Date.now()}`, JSON.stringify({
        responses,
        timestamp: new Date().toISOString()
      }));
      
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm';
      errorMessage.innerHTML = `
        <div class="bg-card border border-border rounded-lg shadow-xl p-8 max-w-md text-center">
          <div class="text-4xl mb-4">⚠️</div>
          <h3 class="text-xl font-bold mb-2">Respuestas guardadas localmente</h3>
          <p class="text-muted-foreground mb-6">
            No pudimos enviar las respuestas ahora, pero las hemos guardado. Las revisaremos más tarde.
          </p>
          <button 
            onclick="this.closest('.fixed').remove()"
            class="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Entendido
          </button>
        </div>
      `;
      document.body.appendChild(errorMessage);
      
      setTimeout(() => {
        errorMessage.remove();
        onClose();
        setResponses({});
        setCurrentStep(0);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const response = responses[question.id] || {};

    switch (question.type) {
      case 'radio':
        return (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label
                key={index}
                className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={response === option}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label
                key={index}
                className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={response[option] || false}
                  onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
            {question.allowOther && (
              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={response.other !== undefined && response.other !== ''}
                    onChange={(e) => handleCheckboxChange(question.id, 'other', e.target.checked)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Otro:</span>
                </label>
                {response.other !== undefined && (
                  <input
                    type="text"
                    value={response.other || ''}
                    onChange={(e) => handleOtherChange(question.id, e.target.value)}
                    placeholder="Especifica..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            )}
          </div>
        );

      case 'textarea':
        // Asegurar que response sea siempre un string para textarea
        const textValue = typeof response === 'string' ? response : '';
        return (
          <div className="space-y-2">
            <textarea
              value={textValue}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              placeholder={question.placeholder || ''}
              rows={4}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
            />
            {question.subtitle && (
              <p className="text-xs text-muted-foreground">{question.subtitle}</p>
            )}
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {Array.from({ length: question.max }, (_, i) => i + 1).map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleInputChange(question.id, rating)}
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition-all duration-200 flex items-center justify-center font-bold",
                    response === rating
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {rating}
                </button>
              ))}
            </div>
            {question.labels && response && (
              <div className="text-center">
                <p className="text-sm font-medium text-primary">{question.labels[response]}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-lg shadow-xl",
          "flex flex-col overflow-hidden",
          isDarkMode && "dark"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-full">
              <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">¡Cuéntame qué tal! 🎯</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tu feedback me ayuda a hacer Simulia aún mejor
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Pregunta {currentStep + 1} de {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% completado
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Question Title */}
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {currentQuestion.title}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              {currentQuestion.subtitle && (
                <p className="text-sm text-muted-foreground">{currentQuestion.subtitle}</p>
              )}
            </div>

            {/* Question Input */}
            {renderQuestion(currentQuestion)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            ← Anterior
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="min-w-[100px]"
              >
                Siguiente →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    ¡Enviar!
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
