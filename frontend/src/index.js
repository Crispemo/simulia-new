import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Importar el proveedor de Google OAuth
import reportWebVitals from './reportWebVitals';


const clientId = '465394843030-lvkbmmj7h4rv8h67lo4h9aqpi6h0v1cs.apps.googleusercontent.com'; // Reemplaza con tu Client ID de Google

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>
);


