import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithGoogle, signOutUser, getRedirectResultAuth } from '../firebase';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  // Configuración global de axios para CORS con credenciales
  axios.defaults.withCredentials = true;
  axios.defaults.headers.post['Content-Type'] = 'application/json';
  axios.defaults.headers.get['Content-Type'] = 'application/json';
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    redirectAttempted: false,
    redirectSuccess: false,
    onAuthStateChangedCalled: false,
    lastError: null
  });

  useEffect(() => {
    let unsub = () => {};
    let redirectHandled = false;
    
    (async () => {
      // Si venimos de un redirect reciente, intenta recuperar el usuario
      const redirectStart = localStorage.getItem('firebase_redirect_start');
      if (redirectStart && Date.now() - parseInt(redirectStart) < 300000) { // Extendido a 5 minutos
        console.log("🔄 AuthContext: Redirección reciente detectada, recuperando usuario...");
        setDebugInfo(prev => ({ ...prev, redirectAttempted: true }));
        
        try {
          const res = await getRedirectResultAuth(); // espera hasta 20 s
          if (res) {
            console.log("✅ AuthContext: Usuario recuperado por redirección:", res.uid);
            setCurrentUser(res);
            localStorage.removeItem('firebase_redirect_start');
            redirectHandled = true;
            setDebugInfo(prev => ({ ...prev, redirectSuccess: true }));
            
            // Procesar el usuario autenticado
            await processAuthenticatedUser(res);
            setLoading(false);
            return; // Salir temprano si se recuperó por redirección
          } else {
            console.log("⚠️ AuthContext: No se pudo recuperar usuario por redirección, esperando onAuthStateChanged...");
            setDebugInfo(prev => ({ ...prev, redirectSuccess: false }));
          }
        } catch (error) {
          console.error("❌ AuthContext: Error al recuperar usuario por redirección:", error);
          setDebugInfo(prev => ({ ...prev, redirectSuccess: false, lastError: error.message }));
        }
      }
      
      // Suscripción única a cambios de estado
      unsub = auth.onAuthStateChanged(async (user) => {
        setDebugInfo(prev => ({ ...prev, onAuthStateChangedCalled: true }));
        
        // Si ya manejamos la redirección exitosamente, ignorar este callback inicial
        if (redirectHandled && !user) {
          console.log("ℹ️ AuthContext: Ignorando onAuthStateChanged null después de redirección exitosa");
          return;
        }
        
        if (user) {
          console.log("✅ AuthContext: onAuthStateChanged detectó usuario:", user.uid);
          setCurrentUser({ uid: user.uid, email: user.email, displayName: user.displayName });
          localStorage.removeItem('firebase_redirect_start');
          
          // Procesar el usuario autenticado solo si no se procesó ya por redirección
          if (!redirectHandled) {
            await processAuthenticatedUser({ uid: user.uid, email: user.email, displayName: user.displayName });
          }
        } else {
          console.log("ℹ️ AuthContext: onAuthStateChanged devolvió null");
          
          // En móviles, dar una segunda oportunidad si hay indicios de redirección reciente
          const redirectStart = localStorage.getItem('firebase_redirect_start');
          if (redirectStart && Date.now() - parseInt(redirectStart) < 300000) {
            console.log("🔄 AuthContext: Segunda oportunidad para redirección móvil...");
            
            // Esperar un poco más para que Firebase se hidrate
            setTimeout(async () => {
              if (auth.currentUser && !currentUser) {
                console.log("✅ AuthContext: Usuario encontrado en segunda oportunidad:", auth.currentUser.uid);
                const userData = {
                  uid: auth.currentUser.uid,
                  email: auth.currentUser.email,
                  displayName: auth.currentUser.displayName
                };
                setCurrentUser(userData);
                localStorage.removeItem('firebase_redirect_start');
                await processAuthenticatedUser(userData);
              }
            }, 2000); // Esperar 2 segundos adicionales
          }
          
          setCurrentUser(null);
        }
        
        // Solo establecer loading como false si no estamos esperando una segunda oportunidad
        if (!redirectStart || Date.now() - parseInt(redirectStart) >= 300000) {
          setLoading(false);
        } else {
          // Si estamos esperando, dar tiempo adicional antes de quitar el loading
          setTimeout(() => setLoading(false), 3000);
        }
      });
    })();
    
    return () => { try { unsub(); } catch {} };
  }, []);

  // Función para procesar un usuario autenticado
  const processAuthenticatedUser = async (userData) => {
    try {
      console.log("Procesando usuario autenticado:", userData.uid);
      
      // Verificar si el usuario existe en nuestra base de datos
      console.log("Verificando si el usuario existe en la base de datos");
      const checkResponse = await axios.post(`${API_URL}/users/check-user-exists`, { 
        userId: userData.uid 
      });
      
      if (!checkResponse.data.exists) {
        console.log("Nuevo usuario detectado, NO registrando automáticamente");
        console.log("El usuario debe completar un pago para ser registrado");
        // NO registrar automáticamente - solo registrar cuando haya un pago válido
        // El registro se hará desde Success.js después del pago exitoso
      } else {
        console.log("Usuario existente identificado");
      }
    } catch (error) {
      console.error("Error al procesar usuario autenticado:", error);
    }
  };

  // Función para iniciar sesión con Google
  const login = async () => {
    try {
      console.log("Iniciando proceso de autenticación con Google");
      setAuthError(null);
      
      const userData = await signInWithGoogle();
      
      // En móviles, signInWithGoogle puede retornar null (redirección)
      if (!userData) {
        console.log("Autenticación iniciada por redirección (móvil)");
        return null;
      }
      
      if (!userData.uid) {
        console.error("Error: No se obtuvo información de usuario válida de Google");
        throw new Error("No se pudo completar la autenticación con Google");
      }
      
      console.log("Autenticación con Google exitosa:", userData.uid);
      return userData;
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setAuthError(error.message || "Error al intentar iniciar sesión");
      throw error;
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await signOutUser();
      return true;
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  };

  // Función para verificar la suscripción del usuario
  const checkSubscription = async (userId) => {
    try {
      console.log("Verificando estado de suscripción para el usuario:", userId);
      setIsCheckingSubscription(true);
      
      if (!userId) {
        console.error("Error: No se proporcionó ID de usuario para verificar suscripción");
        return { hasActiveSubscription: false, error: "ID de usuario no proporcionado" };
      }
      
      const response = await axios.post(`${API_URL}/verify-subscription`, { userId });
      console.log("Respuesta de verificación de suscripción:", response.data);
      
      if (response.data && typeof response.data.hasActiveSubscription === 'boolean') {
        return response.data;
      } else {
        console.error("Respuesta de verificación de suscripción inválida:", response.data);
        return { hasActiveSubscription: false, error: "Respuesta del servidor inválida" };
      }
    } catch (error) {
      console.error("Error al verificar suscripción:", error);
      return { hasActiveSubscription: false, error: error.message };
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  // Función de recuperación manual para casos extremos
  const forceAuthRecovery = async () => {
    try {
      console.log("🔄 AuthContext: Iniciando recuperación manual de autenticación...");
      setDebugInfo(prev => ({ ...prev, lastError: null }));
      
      // Verificar si Firebase tiene un usuario actual
      if (auth.currentUser) {
        console.log("✅ AuthContext: Usuario encontrado en Firebase durante recuperación manual:", auth.currentUser.uid);
        const userData = {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName
        };
        setCurrentUser(userData);
        localStorage.removeItem('firebase_redirect_start');
        await processAuthenticatedUser(userData);
        setLoading(false);
        return true;
      }
      
      // Si hay indicios de redirección reciente, intentar recuperar
      const redirectStart = localStorage.getItem('firebase_redirect_start');
      if (redirectStart) {
        console.log("🔄 AuthContext: Intentando recuperación por redirección durante recuperación manual...");
        const res = await getRedirectResultAuth();
        if (res) {
          console.log("✅ AuthContext: Usuario recuperado durante recuperación manual:", res.uid);
          setCurrentUser(res);
          localStorage.removeItem('firebase_redirect_start');
          await processAuthenticatedUser(res);
          setLoading(false);
          return true;
        }
      }
      
      console.log("⚠️ AuthContext: No se pudo recuperar usuario durante recuperación manual");
      setLoading(false);
      return false;
    } catch (error) {
      console.error("❌ AuthContext: Error durante recuperación manual:", error);
      setDebugInfo(prev => ({ ...prev, lastError: error.message }));
      setLoading(false);
      return false;
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    checkSubscription,
    isCheckingSubscription,
    authError,
    forceAuthRecovery,
    debugInfo,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

