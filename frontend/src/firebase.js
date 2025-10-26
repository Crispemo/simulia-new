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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistencia VÁLIDA para redirect (iOS primero)
(async () => {
  try { 
    await setPersistence(auth, indexedDBLocalPersistence); 
    console.log("✅ Firebase: Persistencia configurada a indexedDB");
  }
  catch { 
    await setPersistence(auth, browserLocalPersistence); 
    console.log("✅ Firebase: Persistencia configurada a localStorage");
  }
})();

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

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
  const res = await getRedirectResult(auth);
  if (res?.user) {
    return { uid: res.user.uid, email: res.user.email, displayName: res.user.displayName };
  }
  const u = await waitForUser(20000);
  return u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
};

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const signInWithGoogle = async () => {
  if (isMobile) {
    localStorage.setItem("firebase_redirect_start", String(Date.now()));
    await signInWithRedirect(auth, provider);
    return null;
  } else {
    const r = await signInWithPopup(auth, provider);
    return { uid: r.user.uid, email: r.user.email, displayName: r.user.displayName };
  }
};

export const signOutUser = async () => {
  await auth.signOut();
  localStorage.removeItem("firebase_redirect_start");
};

// Exportar provider para uso en otros componentes
export { provider };
