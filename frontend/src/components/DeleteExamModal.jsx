import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function DeleteExamModal({
  isOpen,
  onClose,
  onConfirm,
  examType,
  examDate,
  isDarkMode,
  isLoading = false
}) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExamTypeLabel = (type) => {
    const typeMap = {
      'simulacro': 'Simulacro',
      'quizz': 'Quizz',
      'contrarreloj': 'Contrarreloj',
      'protocolos': 'Protocolos',
      'errores': 'Errores',
      'personalizado': 'Personalizado'
    };
    return typeMap[type] || type;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-md bg-card border border-border rounded-lg shadow-xl",
          "p-6 mx-4",
          isDarkMode && "dark"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con icono de cerrar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold">Eliminar Examen</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="space-y-4">
          <p className="text-muted-foreground">
            ¿Estás seguro de que quieres eliminar este examen? Esta acción no se puede deshacer.
          </p>

          {examType && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Tipo:</span>
                <span>{getExamTypeLabel(examType)}</span>
              </div>
              {examDate && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Fecha:</span>
                  <span>{formatDate(examDate)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}