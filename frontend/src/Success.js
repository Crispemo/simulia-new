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

  // Función para completar el registro
  const completeRegistration = async (firebaseUser) => {
    try {
      setStatus('registering');
      console.log('📝 Completando registro para usuario:', firebaseUser.uid);
      
      // Obtener plan de la URL
      const plan = searchParams.get('plan') || 'mensual';
      console.log('📋 Plan seleccionado:', plan);
      
      // 1. Registrar usuario en MongoDB
      console.log('💾 Registrando usuario en base de datos...');
      const registerResponse = await axios.post(`${API_URL}/users/register-user`, {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        plan: plan
      });
      
      console.log('✅ Usuario registrado en MongoDB:', registerResponse.data);
      
      // 2. Verificar que el webhook se envió
      if (registerResponse.data.webhookSent) {
        console.log('📧 Webhook enviado exitosamente');
      } else {
        console.log('⚠️ Webhook no enviado (usuario existente)');
      }
      
      // 3. Redirigir al dashboard
      setStatus('redirecting');
      console.log('🚀 Redirigiendo al dashboard...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error completando registro:', error);
      throw new Error(`Error en registro: ${error.message}`);
    }
  };

  // Renderizado condicional según el estado
  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="success-container">
            <h1>🔄 Procesando Pago...</h1>
            <p>Espera un momento mientras verificamos tu pago.</p>
          </div>
        );
        
      case 'waiting_firebase':
        return (
          <div className="success-container">
            <h1>⏳ Verificando Autenticación...</h1>
            <p>Esperando confirmación de tu cuenta de Google.</p>
          </div>
        );
        
      case 'waiting_auth':
        return (
          <div className="success-container">
            <h1>⏳ Completando Autenticación...</h1>
            <p>Finalizando el proceso de inicio de sesión.</p>
          </div>
        );
        
      case 'registering':
        return (
          <div className="success-container">
            <h1>📝 Completando Registro...</h1>
            <p>Guardando tu información en nuestra base de datos.</p>
          </div>
        );
        
      case 'redirecting':
        return (
          <div className="success-container">
            <h1>✅ ¡Registro Completado!</h1>
            <p>Tu cuenta ha sido creada exitosamente.</p>
            <p>Redirigiendo al dashboard...</p>
          </div>
        );
        
      case 'error':
        return (
          <div className="success-container">
            <h1>❌ Error en el Proceso</h1>
            <p>Ha ocurrido un problema: {error}</p>
            <p>Serás redirigido al inicio en unos segundos...</p>
          </div>
        );
        
      default:
        return (
          <div className="success-container">
            <h1>⏳ Procesando...</h1>
            <p>Por favor espera...</p>
          </div>
        );
    }
  };

  return (
    <div className="success-container">
      {renderContent()}
      
      {/* Debug info */}
      <div style={{fontSize: '12px', color: '#666', marginTop: '20px'}}>
        <p>Estado: {status}</p>
        <p>API_URL: {API_URL}</p>
        <p>Firebase User: {auth.currentUser ? auth.currentUser.uid : 'No autenticado'}</p>
      </div>
    </div>
  );
};

export default SuccessPage;