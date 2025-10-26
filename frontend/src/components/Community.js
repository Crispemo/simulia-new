import React, { useState, useEffect, useRef } from 'react';
import './Community.css';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Community = ({ currentUser, setShowAvatarPopup, hideTitle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser: authUser } = useAuth() || { currentUser: null };
  const user = currentUser || authUser;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, [activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/messages?category=${activeTab}`);
      if (!response.ok) {
        throw new Error('Error al cargar los mensajes');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    if (!user) {
      console.error('Debes iniciar sesión para enviar mensajes');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          category: activeTab,
          userId: user.id || user.uid,
          username: user.name || user.displayName || user.email
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }
      
      const postedMessage = await response.json();
      setMessages([...messages, postedMessage]);
      setNewMessage('');
      
    } catch (err) {
      console.error('Error sending message:', err);
      console.error('No se pudo enviar el mensaje: ' + err.message);
    }
  };

  const handleLikeMessage = async (messageId) => {
    if (!user) {
      console.error('Debes iniciar sesión para dar like a los mensajes');
      return;
    }
    
    // Optimistic update
    setMessages(messages.map(msg => 
      msg._id === messageId 
        ? { ...msg, likes: msg.likes + 1, likedByUser: true } 
        : msg
    ));
    
    try {
      const response = await fetch(`${API_URL}/api/messages/${messageId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id || user.uid
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al dar like al mensaje');
      }
      
      // Revert to server data in case of success
      const updatedMessage = await response.json();
      setMessages(messages.map(msg => 
        msg._id === messageId ? updatedMessage : msg
      ));
      
    } catch (err) {
      console.error('Error liking message:', err);
      console.error('No se pudo dar like al mensaje');
      
      // Revert optimistic update
      fetchMessages();
    }
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, HH:mm", { locale: es });
  };

  return (
    <div className={`community-container ${hideTitle ? 'no-title' : ''}`}>
      {!hideTitle && (
        <>
          <h2>Comunidad de Estudiantes</h2>
          <p className="community-description">
            Conecta con otros estudiantes, comparte recursos y resuelve dudas. Este espacio es para todos los que estamos preparando oposiciones.
          </p>
        </>
      )}
      
      <div className="community-tabs">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} 
          onClick={() => handleTabChange('general')}
        >
          General
        </button>
        <button 
          className={`tab-btn ${activeTab === 'dudas' ? 'active' : ''}`} 
          onClick={() => handleTabChange('dudas')}
        >
          Dudas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recursos' ? 'active' : ''}`} 
          onClick={() => handleTabChange('recursos')}
        >
          Recursos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'presentaciones' ? 'active' : ''}`} 
          onClick={() => handleTabChange('presentaciones')}
        >
          Presentaciones
        </button>
      </div>
      
      <div className="community-messages">
        {isLoading ? (
          <div className="loading-messages">Cargando mensajes...</div>
        ) : error ? (
          <div className="error-messages">
            Error: {error}. Por favor, intenta de nuevo más tarde.
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            No hay mensajes en esta categoría. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message._id || message.id} className="message">
              <div className="message-header">
                <div className="message-sender">
                  {message.username}
                  {message.isAdmin && <span className="admin-label">Admin</span>}
                </div>
                <div className="message-time">{formatMessageDate(message.createdAt)}</div>
              </div>
              <div className="message-content">{message.content}</div>
              <div className="message-actions">
                <button 
                  className={`like-btn ${message.likedByUser ? 'liked' : ''}`}
                  onClick={() => handleLikeMessage(message._id || message.id)}
                  disabled={message.likedByUser}
                >
                  👍 {message.likes > 0 && message.likes}
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="community-form" onSubmit={handleSendMessage}>
        <textarea
          className="community-input"
          placeholder={user ? "Escribe tu mensaje aquí..." : "Inicia sesión para participar"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!user}
        />
        <button 
          type="submit" 
          className="send-btn"
          disabled={!user || !newMessage.trim()}
        >
          Enviar
        </button>
      </form>
      
      {!user && (
        <div className="login-prompt">
          Para participar en la comunidad, necesitas iniciar sesión.
        </div>
      )}
    </div>
  );
};

export default Community;
