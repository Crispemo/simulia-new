// src/firebase.js  (único y definitivo)
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from "firebase/auth";

console.info("FIREBASE_BUILD", "2025-08-29-A");

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Ayuda de depuración en desarrollo para claves ausentes
if (process.env.NODE_ENV !== "production") {
  const missing = Object.entries({
    REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
    REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    REACT_APP_FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    REACT_APP_FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.error(
      "⚠️ Faltan variables de entorno Firebase en desarrollo:",
      missing.join(", "),
      "\nCrea un archivo .env.local en frontend/ con las claves REACT_APP_* y reinicia `npm start`."
    );
  }
}

// Inicializar Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistencia para redirect (iOS primero)
(async () => {
  try { 
    await setPersistence(auth, indexedDBLocalPersistence);
  }
  catch { 
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.error("Error configurando persistencia:", error);
    }
  }
})();

const provider = new GoogleAuthProvider();
// Configuración optimizada para mobile
provider.setCustomParameters({ 
  prompt: "select_account",
  // Forzar uso de redirect en mobile para evitar problemas de popup
  display: "popup"
});

// Configuración adicional para mobile
provider.addScope('email');
provider.addScope('profile');

// Espera robusta de hidratación (hasta 20 s)
const waitForUser = (timeoutMs = 20000) =>
  new Promise((resolve) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    let done = false;
    const end = (u=null) => { if (!done) { done = true; clearInterval(iv); clearTimeout(to); unsub(); resolve(u); } };
    const iv = setInterval(() => { if (auth.currentUser) end(auth.currentUser); }, 200);
    const to = setTimeout(() => end(null), timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => { if (u) end(u); });
  });

export const getRedirectResultAuth = async () => {
  try {
    const res = await getRedirectResult(auth);
    if (res?.user) {
      return { uid: res.user.uid, email: res.user.email, displayName: res.user.displayName };
    }
    
    const u = await waitForUser(10000);
    if (u) {
      return { uid: u.uid, email: u.email, displayName: u.displayName };
    }
    
    return null;
  } catch (error) {
    console.error('Error en getRedirectResult:', error);
    return null;
  }
};

// Ya no necesitamos detección mobile específica - usamos popup para todos

export const signInWithGoogle = async () => {
  try {
    const r = await signInWithPopup(auth, provider);
    
    localStorage.removeItem("firebase_redirect_start");
    localStorage.removeItem("redirect_info");
    localStorage.setItem('redirect_attempts', '0');
    
    return { uid: r.user.uid, email: r.user.email, displayName: r.user.displayName };
  } catch (popupError) {
    const popupBlockedErrors = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request'
    ];
    
    if (popupBlockedErrors.includes(popupError.code)) {
      const redirectInfo = {
        timestamp: Date.now(),
        attempt: (parseInt(localStorage.getItem('redirect_attempts') || '0')) + 1
      };
      
      localStorage.setItem("firebase_redirect_start", String(redirectInfo.timestamp));
      localStorage.setItem("redirect_info", JSON.stringify(redirectInfo));
      
      try {
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectError) {
        localStorage.removeItem("firebase_redirect_start");
        localStorage.removeItem("redirect_info");
        throw redirectError;
      }
    } else {
      throw popupError;
    }
  }
};

export const signOutUser = async () => {
  await auth.signOut();
  localStorage.removeItem("firebase_redirect_start");
  localStorage.removeItem("redirect_info");
  localStorage.removeItem("redirect_attempts");
};

// Función para limpiar estado de redirección fallida
export const cleanupFailedRedirect = () => {
  localStorage.removeItem("firebase_redirect_start");
  localStorage.removeItem("redirect_info");
  
  const attempts = parseInt(localStorage.getItem('redirect_attempts') || '0') + 1;
  localStorage.setItem('redirect_attempts', String(attempts));
  
  return attempts;
};

// Función para forzar verificación de estado
export const forceAuthStateCheck = async () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
    
    setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 5000);
  });
};

// Función para recargar el usuario actual
export const reloadCurrentUser = async () => {
  if (auth.currentUser) {
    try {
      await auth.currentUser.reload();
      return auth.currentUser;
    } catch (error) {
      return null;
    }
  }
  return null;
};

// Exportar provider para uso en otros componentes
export { provider };