import React, { useState } from 'react';
import { X } from 'lucide-react';
import { API_URL } from '../config';
import './TicketModal.css';

const TicketModal = ({ isOpen, onClose, userId }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setErrorMessage('Por favor, describe el problema o error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const ticketData = {
        subject: subject.trim() || 'Sin asunto',
        description: description.trim(),
        userId: userId || null
      };

      const response = await fetch(`${API_URL}/send-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (response.ok) {
        setSuccessMessage('Ticket enviado correctamente. Te responderemos pronto.');
        setSubject('');
        setDescription('');
        
        // Cerrar el modal después de 2 segundos
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 2000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Error al enviar el ticket. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al enviar ticket:', error);
      setErrorMessage('Error de conexión. Por favor, verifica tu conexión e intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setDescription('');
      setErrorMessage('');
      setSuccessMessage('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ticket-modal-overlay" onClick={handleClose}>
      <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="ticket-modal-close"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>
        
        <h3>Reportar un error o incidencia</h3>
        <p className="ticket-modal-subtitle">
          Describe el problema que has encontrado y te ayudaremos a resolverlo.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="ticket-form-group">
            <label htmlFor="ticket-subject">Asunto (opcional)</label>
            <input
              id="ticket-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Error al cargar preguntas"
              className="ticket-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="ticket-form-group">
            <label htmlFor="ticket-description">
              Descripción <span className="required">*</span>
            </label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe detalladamente el problema o error que has encontrado..."
              className="ticket-textarea"
              rows="6"
              required
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <div className="ticket-error-message">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="ticket-success-message">
              {successMessage}
            </div>
          )}

          <div className="ticket-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="ticket-btn-cancel"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="ticket-btn-submit"
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketModal;








