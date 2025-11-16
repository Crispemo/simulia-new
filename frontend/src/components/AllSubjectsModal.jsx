import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { API_URL } from '../config';

export default function AllSubjectsModal({ isOpen, onClose, userId, isDarkMode }) {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lista completa de asignaturas como fallback
  const ALL_SUBJECTS_FALLBACK = [
    'CARDIOLOGÍA',
    'DERMATOLOGÍA-HERIDAS CRÓNICAS',
    'DIGESTIVO',
    'ENDOCRINO',
    'ENFERMERÍA COMUNITARIA',
    'ENFERMERIA DEL TRABAJO',
    'ENFERMERÍA FAMILIAR Y COMUNITARIA',
    'FARMACOLOGÍA',
    'GERIATRÍA',
    'GESTIÓN-LESGILACIÓN-BIOÉTICA',
    'GINECOLOGIA-OBSTETRICIA',
    'HEMATOLOGÍA',
    'HISTORIA Y FUNDAMENTOS DE ENFERMERÍA',
    'INVESTIGACIÓN',
    'MÉDICO-QUIRÚRGICA',
    'NEFROLOGÍA-UROLOGÍA',
    'NEUROLOGÍA',
    'NUTRICIÓN Y DIETÉTICA',
    'ONCOLOGÍA Y PALIATIVOS',
    'PEDIATRÍA',
    'RESPIRATORIO',
    'SALUD MENTAL',
    'SALUD PÚBLICA- INFECCIOSOS-VACUNAS',
    'SEGURIDAD',
    'TÉCNICAS DE ENFERMERÍA',
    'TRAUMATOLOGÍA-REUMATOLOGÍA',
    'URGENCIAS Y CRÍTICOS'
  ];

  // Obtener datos del endpoint cuando se abre el modal
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) {
        return;
      }
      
      setIsLoading(true);
      try {
        // Obtener todas las asignaturas disponibles
        let allSubjectsList = [];
        try {
          const subjectsResponse = await fetch(`${API_URL}/subjects`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          
          if (subjectsResponse.ok) {
            const subjectsData = await subjectsResponse.json();
            allSubjectsList = subjectsData.map(s => s.id || s.nombre || s).filter(Boolean);
          }
        } catch (error) {
          console.warn('Error al obtener asignaturas del endpoint, usando lista fallback:', error);
        }
        
        // Si no se obtuvieron asignaturas del endpoint, usar la lista fallback
        if (allSubjectsList.length === 0) {
          allSubjectsList = [...ALL_SUBJECTS_FALLBACK];
        }
        
        console.log('Asignaturas disponibles:', allSubjectsList.length);
        
        // Inicializar todas las asignaturas con 0 fallos
        const subjectErrorsMap = {};
        allSubjectsList.forEach(subject => {
          subjectErrorsMap[subject] = 0;
        });
        
        // Obtener fallos por asignatura (solo si hay userId)
        if (userId) {
          try {
            const failedResponse = await fetch(`${API_URL}/failed-questions/${userId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include'
            });
            
            // Si hay preguntas falladas, contar por asignatura
            if (failedResponse.ok) {
              const failedData = await failedResponse.json();
              
              if (failedData && failedData.questions && failedData.questions.length > 0) {
                // Process the failed questions
                const processedFailedQuestions = failedData.questions.map(q => ({
                  ...q,
                  options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
                    [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
                      .filter(option => option && option !== '-')
                }));
                
                // Group and count failed questions by subject
                processedFailedQuestions.forEach(question => {
                  const subject = question.subject || 'General';
                  // Filtrar asignaturas inválidas
                  if (subject && subject !== 'undefined' && subject !== 'test' && subject !== 'Test' && subject !== 'ERROR' && subject !== 'Error' && subject !== 'null') {
                    // Si la asignatura no está en la lista de todas las asignaturas, agregarla
                    if (!subjectErrorsMap.hasOwnProperty(subject)) {
                      subjectErrorsMap[subject] = 0;
                    }
                    subjectErrorsMap[subject]++;
                  }
                });
              }
            }
          } catch (error) {
            console.warn('Error al obtener preguntas falladas:', error);
            // Continuar aunque falle, ya tenemos todas las asignaturas inicializadas con 0
          }
        }
        
        // Convert to array format y ordenar: primero las que tienen fallos (de mayor a menor), luego las que no tienen fallos
        const errorsArray = Object.entries(subjectErrorsMap)
          .map(([name, count]) => ({
            name,
            count
          }))
          .sort((a, b) => {
            // Primero ordenar por si tienen fallos (las que tienen fallos primero)
            if (a.count > 0 && b.count === 0) return -1;
            if (a.count === 0 && b.count > 0) return 1;
            // Si ambas tienen o no tienen fallos, ordenar por cantidad
            return b.count - a.count;
          });
        
        console.log('Array final de asignaturas:', errorsArray);
        console.log('Total de asignaturas:', errorsArray.length);
        console.log('Asignaturas con fallos:', errorsArray.filter(s => s.count > 0).length);
        
        setSubjects(errorsArray);
      } catch (error) {
        if (!error.message?.includes('CORS') && !error.message?.includes('Failed to fetch')) {
          console.warn('Error al procesar datos:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  // Ordenar por cantidad de fallos (de mayor a menor)
  const sortedSubjects = [...(subjects || [])].sort((a, b) => {
    // Primero ordenar por si tienen fallos (las que tienen fallos primero)
    if (a.count > 0 && b.count === 0) return -1;
    if (a.count === 0 && b.count > 0) return 1;
    // Si ambas tienen o no tienen fallos, ordenar por cantidad
    return b.count - a.count;
  });
  const maxCount = sortedSubjects.length > 0 && sortedSubjects[0].count > 0 ? sortedSubjects[0].count : 1;

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
          <div>
            <h2 className="text-2xl font-bold">Todas las Asignaturas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {sortedSubjects.filter(s => s.count > 0).length} con fallos • {sortedSubjects.length} totales
            </p>
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

        {/* Lista de asignaturas */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando asignaturas...</p>
            </div>
          ) : sortedSubjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay asignaturas con fallos registrados
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSubjects.map((subject, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center justify-between p-3 border rounded-lg transition-colors",
                    subject.count > 0 
                      ? "border-border hover:border-primary" 
                      : "border-border/50 opacity-75"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium flex-1",
                    subject.count === 0 && "text-muted-foreground"
                  )}>
                    {subject.name}
                  </span>
                  <div className="flex items-center gap-3">
                    {subject.count > 0 ? (
                      <>
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-400 to-red-600"
                            style={{ width: `${Math.min(100, (subject.count / maxCount) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-red-600 w-12 text-right">
                          {subject.count}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-secondary" style={{ width: '0%' }} />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                          0
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/50">
          <p className="text-xs text-center text-muted-foreground">
            Total de asignaturas: {sortedSubjects.length}
          </p>
        </div>
      </div>
    </div>
  );
}

