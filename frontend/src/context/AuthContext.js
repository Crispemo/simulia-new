import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithGoogle, signOutUser, getRedirectResultAuth, forceAuthStateCheck, reloadCurrentUser, cleanupFailedRedirect } from '../firebase';
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

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const redirectStart = localStorage.getItem('firebase_redirect_start');
      
      if (redirectStart && Date.now() - parseInt(redirectStart) < 120000) {
        const res = await getRedirectResultAuth();
        if (res) {
          setCurrentUser(res);
          localStorage.removeItem('firebase_redirect_start');
          localStorage.removeItem('redirect_info');
        } else {
          localStorage.removeItem('firebase_redirect_start');
          localStorage.removeItem('redirect_info');
        }
      } else if (redirectStart) {
        localStorage.removeItem('firebase_redirect_start');
        localStorage.removeItem('redirect_info');
      }
      
      unsub = auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userData = { uid: user.uid, email: user.email, displayName: user.displayName };
          setCurrentUser(userData);
          localStorage.removeItem('firebase_redirect_start');
          await processAuthenticatedUser(userData);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
    })();
    return () => { try { unsub(); } catch {} };
  }, []);

  // Función para procesar un usuario autenticado
  const processAuthenticatedUser = async (userData) => {
    try {
      const checkResponse = await axios.post(`${API_URL}/users/check-user-exists`, { 
        userId: userData.uid 
      });
      
      // NO registrar automáticamente - solo registrar cuando haya un pago válido
      // El registro se hará desde Success.js después del pago exitoso
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
      setIsCheckingSubscription(true);
      
      if (!userId) {
        return { hasActiveSubscription: false, error: "ID de usuario no proporcionado" };
      }
      
      const response = await axios.post(`${API_URL}/verify-subscription`, { userId });
      
      if (response.data && typeof response.data.hasActiveSubscription === 'boolean') {
        return response.data;
      } else {
        return { hasActiveSubscription: false, error: "Respuesta del servidor inválida" };
      }
    } catch (error) {
      console.error("Error al verificar suscripción:", error);
      return { hasActiveSubscription: false, error: error.message };
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    checkSubscription,
    isCheckingSubscription,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
