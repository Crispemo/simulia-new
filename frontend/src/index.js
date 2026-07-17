import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Importar el proveedor de Google OAuth
import reportWebVitals from './reportWebVitals';


const clientId = '465394843030-lvkbmmj7h4rv8h67lo4h9aqpi6h0v1cs.apps.googleusercontent.com'; // Reemplaza con tu Client ID de Google

const app = (
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>
);

const rootElement = document.getElementById('root');

// Si react-snap ya prerenderizó HTML en este nodo, hidratamos en vez de
// volver a montar desde cero (evita parpadeo y aprovecha el HTML servido).
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, app);
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(app);
}


