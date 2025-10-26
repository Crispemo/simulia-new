// components/ChatBot.jsx
import React, { useState, useRef, useEffect } from "react";
import "./ChatBot.css";

const ChatBot = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      text: "¡Hola! Soy el asistente de Simulia. ¿En qué puedo ayudarte con tu preparación EIR?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Añadir mensaje del usuario
    const userMessage = {
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simular respuesta del bot después de un breve retraso
    setTimeout(() => {
      const botResponse = getBotResponse(inputText);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const getBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    let response = "";

    // Respuestas simples basadas en palabras clave
    if (input.includes("hola") || input.includes("saludos") || input.includes("buenos días")) {
      response = "¡Hola! ¿En qué puedo ayudarte hoy con tu preparación EIR?";
    } else if (input.includes("gracias")) {
      response = "¡De nada! Estoy aquí para ayudarte.";
    } else if (input.includes("examen") || input.includes("simulacro")) {
      response = "Puedes realizar un simulacro EIR completo o personalizar tu examen según las asignaturas que quieras practicar.";
    } else if (input.includes("asignatura") || input.includes("materia") || input.includes("tema")) {
      response = "Tenemos contenido para todas las asignaturas del EIR: Enfermería Médico-Quirúrgica, Fundamentos, Administración, Pediatría, Geriatría, etc.";
    } else if (input.includes("estadística") || input.includes("progreso") || input.includes("rendimiento")) {
      response = "Puedes ver tu progreso en la sección 'Progreso' del dashboard. Allí encontrarás gráficos de rendimiento por asignaturas y tu evolución en el tiempo.";
    } else if (input.includes("error") || input.includes("fallo")) {
      response = "La función 'Repite tus errores' te permite practicar específicamente con las preguntas que has fallado anteriormente.";
    } else if (input.includes("tiempo") || input.includes("contrarreloj")) {
      response = "El modo 'Contrarreloj' te permite practicar con límite de tiempo para mejorar tu velocidad de respuesta.";
    } else if (input.includes("comunidad") || input.includes("foro") || input.includes("chat")) {
      response = "Puedes acceder a nuestra comunidad haciendo clic en el botón 'Comunidad' en la barra superior. Allí podrás interactuar con otros estudiantes.";
    } else {
      response = "No estoy seguro de entender tu pregunta. ¿Puedes reformularla o preguntar sobre simulacros, asignaturas, estadísticas o funciones específicas de la plataforma?";
    }

    return {
      text: response,
      sender: "bot",
      timestamp: new Date(),
    };
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>Asistente Simulia</h3>
        <button className="close-button" onClick={onClose}>&times;</button>
      </div>
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <div className="message-content">
              <p>{msg.text}</p>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="message-content typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chatbot-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe tu pregunta..."
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
};

export default ChatBot;
