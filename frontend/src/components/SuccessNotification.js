import React, { useEffect } from 'react';
import './SuccessNotification.css';

const SuccessNotification = ({ message, onClose, autoCloseTime = 1500, type = 'success' }) => {
  useEffect(() => {
    if (autoCloseTime && onClose) {
      console.log(`SuccessNotification: Configurando timer para ${autoCloseTime}ms`);
      const timer = setTimeout(() => {
        console.log('SuccessNotification: Timer ejecutado, cerrando notificación');
        onClose();
      }, autoCloseTime);
      
      return () => {
        console.log('SuccessNotification: Limpiando timer');
        clearTimeout(timer);
      };
    } else {
      console.log('SuccessNotification: No se configuró timer - autoCloseTime:', autoCloseTime, 'onClose:', !!onClose);
    }
  }, [autoCloseTime]); // REMOVED onClose from dependencies to prevent infinite loop

  // Determinar el tipo de notificación basado en el mensaje
  const getNotificationType = () => {
    if (message.toLowerCase().includes('impugnación')) return 'dispute';
    if (message.toLowerCase().includes('error')) return 'error';
    return 'success';
  };

  const notificationType = getNotificationType();
  const notificationClass = `success-notification ${notificationType}-notification`;

  return (
    <div className="success-notification-overlay">
      <div className={notificationClass}>
        <div className="success-icon">✓</div>
        <div className="success-message">{message}</div>
      </div>
    </div>
  );
};

export default SuccessNotification; 