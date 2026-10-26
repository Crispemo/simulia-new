import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../firebase';

const PaymentButton = ({ plan, amount, onPaymentStart }) => {
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentClick = async () => {
    if (!currentUser) {
      // Si no hay usuario, iniciar autenticación
      console.log('🔐 No hay usuario autenticado, iniciando login...');
      try {
        setIsProcessing(true);
        await signInWithGoogle();
        // El usuario será redirigido o autenticado, no necesitamos hacer nada más aquí
      } catch (error) {
        console.error('❌ Error iniciando autenticación:', error);
        if (error?.code === 'simulia/in-app-browser') {
          alert('Google no permite iniciar sesión dentro de Instagram/WhatsApp. Toca ⋯ arriba a la derecha y elige «Abrir en el navegador» (Safari o Chrome).');
        }
        setIsProcessing(false);
      }
      return;
    }

    // Si hay usuario, proceder con el pago
    if (onPaymentStart) {
      onPaymentStart(currentUser);
    }
  };

  const isDisabled = isProcessing || (!currentUser && isProcessing);

  return (
    <button
      onClick={handlePaymentClick}
      disabled={isDisabled}
      className={`payment-button ${isDisabled ? 'disabled' : ''}`}
    >
      {!currentUser ? (
        isProcessing ? '🔄 Iniciando sesión...' : '🔐 Iniciar sesión para pagar'
      ) : (
        `💳 Pagar ${amount}€ - ${plan}`
      )}
    </button>
  );
};

export default PaymentButton;
