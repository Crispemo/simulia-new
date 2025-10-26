import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';
import './checkout.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { STRIPE_CONFIG, API_URL } from './config';

const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null); // Estado para el plan seleccionado
  const [currentUser, setCurrentUser] = useState(null); // Usuario autenticado

  // Simulación de planes para seleccionar
  const plans = [
      { type: 'mensual', amount: 999, label: 'Plan Explora sin presión (9.99 €/mes)' },
  { type: 'anual', amount: 3999, label: 'Plan Voy a por la plaza (39.99 €/año)' },
  ];
  
  useEffect(() => {
    // Simular autenticación (puedes integrar tu lógica real aquí)
    const authenticateUser = async () => {
      try {
        const user = await axios.get(`${API_URL}/get-current-user`);
        setCurrentUser(user.data);
      } catch (error) {
        console.error('Error al autenticar al usuario:', error);
        navigate('/login'); // Redirigir si no está autenticado
      }
    };

    authenticateUser();
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
  
    if (!selectedPlan || !currentUser) {
      setErrorMessage('Selecciona un plan e inicia sesión antes de continuar.');
      return;
    }
  
    try {
      const response = await axios.post(`${API_URL}/create-payment-intent`, {
        userId: currentUser.uid,
        email: currentUser.email,
        userName: currentUser.displayName || currentUser.uid, // Añadir nombre del usuario
        plan: selectedPlan.type,
        amount: selectedPlan.amount,
      });
  
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        setErrorMessage('Error al procesar el pago.');
      }
    } catch (error) {
      console.error('Error en el pago:', error.message);
      setErrorMessage('Hubo un problema. Inténtalo más tarde.');
    }
  };
  
  return (
    <div className="checkout-container">
      <form onSubmit={handleSubmit} className="checkout-form">
        <h3>Selecciona tu plan</h3>
        {plans.map((plan) => (
          <div key={plan.type}>
            <input
              type="radio"
              id={plan.type}
              name="plan"
              value={plan.type}
              onChange={() => setSelectedPlan(plan)}
            />
            <label htmlFor={plan.type}>{plan.label}</label>
          </div>
        ))}

        <h3>Información de pago</h3>
        <CardElement className="card-element" />
        <button type="submit" disabled={!stripe || !elements || !selectedPlan}>
          Pagar
        </button>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {paymentSuccess && <div className="success-message">¡Pago realizado con éxito!</div>}
      </form>
    </div>
  );
};

const CheckoutPage = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);

export default CheckoutPage;