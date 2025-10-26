import { useState, useEffect, useRef } from "react"
import "./Community.css"

const Community = () => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [activeTab, setActiveTab] = useState("general")
  const [currentUser, setCurrentUser] = useState({
    id: "user1",
    name: "Usuario de Prueba",
    avatar: "/muñeco_enfermera.png",
  })
  const messagesEndRef = useRef(null)

  // Datos de ejemplo para simular una comunidad
  const demoMessages = [
    {
      id: "msg1",
      text: "¡Hola a todos! ¿Alguien tiene recursos sobre Farmacología?",
      userId: "user2",
      userName: "María García",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 3600000 * 2),
      likes: ["user3", "user4"],
      category: "general",
    },
    {
      id: "msg2",
      text: "Yo tengo unos apuntes muy buenos de Farmacología. Los comparto esta tarde.",
      userId: "user3",
      userName: "Carlos Rodríguez",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 3600000),
      likes: ["user2"],
      category: "general",
    },
    {
      id: "msg3",
      text: "¿Alguien sabe cuándo salen las fechas del próximo EIR?",
      userId: "user4",
      userName: "Laura Martínez",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 1800000),
      likes: [],
      category: "general",
    },
    {
      id: "msg4",
      text: "¡Acabo de terminar mi primer simulacro completo! 😊",
      userId: "user5",
      userName: "Javier López",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 900000),
      likes: ["user2", "user3", "user1"],
      category: "general",
    },
    {
      id: "msg5",
      text: "Hola, me presento. Soy Ana y estoy empezando a preparar el EIR. ¡Encantada!",
      userId: "user6",
      userName: "Ana Sánchez",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 600000),
      likes: ["user1", "user2", "user3", "user4", "user5"],
      category: "presentaciones",
    },
    {
      id: "msg6",
      text: "¿Alguien tiene problemas con las preguntas de Pediatría? Me están costando mucho.",
      userId: "user7",
      userName: "Pedro Gómez",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 300000),
      likes: [],
      category: "dudas",
    },
    {
      id: "msg7",
      text: "Comparto este vídeo sobre técnicas de enfermería que me ha ayudado mucho: https://ejemplo.com/video",
      userId: "user8",
      userName: "Elena Díaz",
      userAvatar: "/placeholder.svg?height=40&width=40",
      timestamp: new Date(Date.now() - 120000),
      likes: ["user1", "user3"],
      category: "recursos",
    },
  ]

  // Cargar mensajes de ejemplo al inicio
  useEffect(() => {
    setMessages(demoMessages)
  }, [])

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const newMsg = {
      id: `msg${Date.now()}`,
      text: newMessage,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      timestamp: new Date(),
      likes: [],
      category: activeTab,
    }

    setMessages([...messages, newMsg])
    setNewMessage("")
  }

  const handleLike = (messageId) => {
    setMessages(
      messages.map((msg) => {
        if (msg.id === messageId) {
          const userLiked = msg.likes.includes(currentUser.id)
          return {
            ...msg,
            likes: userLiked ? msg.likes.filter((id) => id !== currentUser.id) : [...msg.likes, currentUser.id],
          }
        }
        return msg
      }),
    )
  }

  const formatTime = (date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "Ahora"
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} h`
    if (days < 7) return `Hace ${days} días`
    return new Date(date).toLocaleDateString()
  }

  // Filtrar mensajes por categoría
  const filteredMessages = messages.filter((msg) => activeTab === "general" || msg.category === activeTab)

  return (
    <div className="community-container">
      <div className="community-header">
        <h2>Comunidad Simulia</h2>
        <div className="community-tabs">
          <button
            className={`tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button className={`tab-btn ${activeTab === "dudas" ? "active" : ""}`} onClick={() => setActiveTab("dudas")}>
            Dudas
          </button>
          <button
            className={`tab-btn ${activeTab === "recursos" ? "active" : ""}`}
            onClick={() => setActiveTab("recursos")}
          >
            Recursos
          </button>
          <button
            className={`tab-btn ${activeTab === "presentaciones" ? "active" : ""}`}
            onClick={() => setActiveTab("presentaciones")}
          >
            Presentaciones
          </button>
        </div>
      </div>

      <div className="community-messages">
        {filteredMessages.length === 0 ? (
          <div className="no-messages">
            <p>No hay mensajes en esta categoría. ¡Sé el primero en escribir!</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div key={message.id} className="message-item">
              <div className="message-avatar">
                <img src={message.userAvatar || "/muñeco_enfermera.png"} alt={message.userName} />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">{message.userName}</span>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
                <p className="message-text">{message.text}</p>
                <div className="message-actions">
                  <button
                    className={`like-btn ${message.likes.includes(currentUser.id) ? "liked" : ""}`}
                    onClick={() => handleLike(message.id)}
                  >
                    👍 {message.likes.length > 0 ? message.likes.length : ""}
                  </button>
                  <button className="reply-btn">💬 Responder</button>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="community-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Escribe un mensaje en ${activeTab}...`}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  )
}

export default Community
