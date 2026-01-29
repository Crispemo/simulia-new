import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getRedirectResultAuth } from './firebase';
import axios from 'axios';
import { API_URL } from './config';

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSuccessFlow = async () => {
      try {
        console.log('=== SUCCESS PAGE - INICIANDO FLUJO ===');
        
        // 1. Esperar a que Firebase se estabilice
        setStatus('waiting_firebase');
        console.log('⏳ Esperando estabilización de Firebase...');
        
        // 2. Verificar si hay resultado de redirección
        const redirectResult = await getRedirectResultAuth();
        if (redirectResult) {
          console.log('✅ Usuario autenticado por redirección:', redirectResult.uid);
          await completeRegistration(redirectResult);
          return;
        }
        
        // 3. Si no hay redirección, esperar a que Firebase se estabilice
        setStatus('waiting_auth');
        console.log('⏳ Esperando autenticación de Firebase...');
        
        // 4. Esperar hasta que Firebase tenga un usuario o timeout
        const user = await waitForFirebaseUser();
        if (user) {
          console.log('✅ Usuario autenticado en Firebase:', user.uid);
          await completeRegistration(user);
        } else {
          throw new Error('No se pudo obtener usuario de Firebase después del pago');
        }
        
      } catch (error) {
        console.error('❌ Error en flujo de éxito:', error);
        setError(error.message);
        setStatus('error');
        
        // Redirigir al inicio después de mostrar error
        setTimeout(() => navigate('/'), 5000);
      }
    };

    handleSuccessFlow();
  }, [navigate]);

  // Función para esperar a que Firebase tenga un usuario
  const waitForFirebaseUser = (timeoutMs = 10000) => {
    return new Promise((resolve) => {
      let resolved = false;
      
      // Verificar si ya hay usuario
      if (auth.currentUser) {
        resolved = true;
        resolve(auth.currentUser);
        return;
      }
      
      // Esperar cambios en el estado de autenticación
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!resolved && user) {
          resolved = true;
          unsubscribe();
          resolve(user);
        }
      });
      
      // Timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve(null);
        }
      }, timeoutMs);
    });
  };

  // Flujo sin webhook: confirmar con Stripe usando session_id y activar plan en Mongo
  const completeRegistration = async (firebaseUser) => {
    try {
      setStatus('registering');
      console.log('📝 SUCCESS (confirm-checkout) usuario:', firebaseUser.uid);

      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        throw new Error('Falta session_id en la URL de éxito');
      }

      // El backend valida contra Stripe:
      // - session.status === 'complete'
      // - session.client_reference_id === userId
      // y solo entonces activa plan en Mongo
      const confirmResponse = await axios.post(`${API_URL}/stripe/confirm-checkout`, {
        sessionId,
        userId: firebaseUser.uid
      });

      console.log('✅ Checkout confirmado y plan activado:', confirmResponse.data);

      setStatus('redirecting');
      setTimeout(() => navigate('/dashboard'), 300);
      
    } catch (error) {
      console.error('❌ Error completando registro:', error);
      throw new Error(`Error en registro: ${error.message}`);
    }
  };

  // Renderizado condicional según el estado
  const renderContent = () => {
    switch (status) {
      case 'processing':
        return null;
        
      case 'waiting_firebase':
        return null;
        
      case 'waiting_auth':
        return null;
        
      case 'registering':
        return null;
        
      case 'redirecting':
        return null;
        
      case 'error':
        return (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <h2>Error</h2>
            <p>{error}</p>
            <p>Te devolvemos al inicio en unos segundos…</p>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    // Página intencionalmente en blanco mientras se confirma/activa la suscripción
    <div style={{ width: '100vw', height: '100vh', background: '#fff' }}>
      {renderContent()}
    </div>
  );
};

export default SuccessPage;