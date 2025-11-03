import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Bot, Send, Loader2 } from 'lucide-react'
import { API_URL } from '../config'

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      text: "¡Hola! Soy el asistente de IA de Simulia. ¿En qué puedo ayudarte con tu preparación para el examen EIR?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const getBotResponse = (userInput) => {
    const input = userInput.toLowerCase()
    let response = ""

    // Respuestas inteligentes basadas en palabras clave relacionadas con EIR
    if (input.includes("hola") || input.includes("saludos") || input.includes("buenos días") || input.includes("hi")) {
      response = "¡Hola! ¿En qué puedo ayudarte hoy con tu preparación EIR?"
    } else if (input.includes("gracias") || input.includes("thank")) {
      response = "¡De nada! Estoy aquí para ayudarte en todo lo que necesites."
    } else if (input.includes("examen") || input.includes("simulacro") || input.includes("prueba")) {
      response = "Puedes realizar un simulacro EIR completo de 175 preguntas o crear exámenes personalizados según las asignaturas que quieras practicar. También tienes opciones como el modo contrarreloj para mejorar tu velocidad."
    } else if (input.includes("asignatura") || input.includes("materia") || input.includes("tema") || input.includes("área")) {
      response = "Tenemos contenido para todas las asignaturas del EIR: Enfermería Médico-Quirúrgica, Fundamentos de Enfermería, Enfermería Comunitaria, Administración y Gestión, Pediatría, Geriatría, Salud Mental, Endocrinología, y muchas más. Puedes filtrar por asignatura al crear un examen."
    } else if (input.includes("estadística") || input.includes("progreso") || input.includes("rendimiento") || input.includes("resultado")) {
      response = "Puedes ver tu progreso en la sección 'Progreso' del dashboard. Allí encontrarás gráficos de rendimiento por asignaturas, tu evolución en el tiempo, y estadísticas detalladas de tus exámenes."
    } else if (input.includes("error") || input.includes("fallo") || input.includes("incorrecta")) {
      response = "La función 'Repite tus errores' te permite practicar específicamente con las preguntas que has fallado anteriormente. Esto te ayuda a mejorar en las áreas donde más dificultades tienes."
    } else if (input.includes("tiempo") || input.includes("contrarreloj") || input.includes("velocidad")) {
      response = "El modo 'Contrarreloj' te permite practicar con límite de tiempo (14 minutos para 30 preguntas) para mejorar tu velocidad de respuesta y simular las condiciones reales del examen."
    } else if (input.includes("comunidad") || input.includes("foro") || input.includes("chat") || input.includes("discusión")) {
      response = "Puedes acceder a nuestra comunidad haciendo clic en el botón 'Comunidad' en la barra superior. Allí podrás interactuar con otros estudiantes, compartir experiencias y resolver dudas."
    } else if (input.includes("suscripción") || input.includes("plan") || input.includes("precio") || input.includes("pago")) {
      response = "Tenemos planes de suscripción mensual y anual. Puedes consultar los detalles en la sección de suscripciones. Si tienes problemas con tu suscripción, contacta con nuestro equipo de soporte."
    } else if (input.includes("ayuda") || input.includes("help") || input.includes("cómo") || input.includes("como")) {
      response = "Estoy aquí para ayudarte. Puedes preguntarme sobre: exámenes, asignaturas, estadísticas, errores, modo contrarreloj, comunidad, o cualquier otra duda sobre la plataforma Simulia."
    } else if (input.includes("protocolo") || input.includes("protocolos")) {
      response = "Los exámenes de protocolos te permiten practicar con casos prácticos y protocolos de enfermería específicos. Son ideales para preparar la parte más práctica del examen EIR."
    } else if (input.includes("eir") || input.includes("enfermero interno residente")) {
      response = "El Examen de Enfermero Interno Residente (EIR) es una prueba competitiva para acceder a la especialización. En Simulia puedes prepararte con miles de preguntas, simulacros completos y seguimiento de tu progreso."
    } else {
      response = "Entiendo tu pregunta. Puedo ayudarte con información sobre exámenes, asignaturas, estadísticas, errores, o cualquier aspecto de la plataforma Simulia. ¿Podrías reformular tu pregunta o preguntar algo más específico?"
    }

    return {
      text: response,
      sender: "bot",
      timestamp: new Date(),
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!inputText.trim() || isLoading) return

    const messageText = inputText.trim()
    
    const userMessage = {
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    }
    
    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setIsLoading(true)

    // Llamar a la API de ChatGPT con el historial completo
    try {
      const token = localStorage.getItem('token')
      
      // Enviar el historial completo de mensajes (excepto el mensaje de bienvenida inicial)
      const messagesToSend = messages
        .filter(msg => msg.sender !== 'bot' || msg.text !== "¡Hola! Soy el asistente de IA de Simulia. ¿En qué puedo ayudarte con tu preparación para el examen EIR?")
        .concat(userMessage) // Agregar el nuevo mensaje del usuario
      
      const response = await fetch(`${API_URL}/ai-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ 
          message: messageText,
          messages: messagesToSend.slice(0, -1) // Enviar historial sin el último mensaje (ya está en message)
        })
      })

      if (response.ok) {
        const data = await response.json()
        const botResponse = {
          text: data.response || "Lo siento, no pude procesar tu mensaje.",
          sender: "bot",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, botResponse])
        setIsLoading(false)
      } else {
        // Si la API no está disponible, usar respuestas inteligentes
        throw new Error('API no disponible, usando fallback')
      }
    } catch (error) {
      // Silenciar errores CORS y usar fallback silenciosamente
      if (!error.message?.includes('CORS') && !error.message?.includes('Failed to fetch')) {
        console.warn('ChatGPT no disponible, usando respuestas inteligentes:', error.message)
      }
      // Usar sistema de respuestas inteligentes como fallback
      const botResponse = getBotResponse(messageText)
      setTimeout(() => {
        setMessages((prev) => [...prev, botResponse])
        setIsLoading(false)
      }, 800)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Bot className="mr-2 h-4 w-4" />
        Asistente IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Asistente de IA - Simulia
            </DialogTitle>
          </DialogHeader>
          
          {/* Área de mensajes con scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(600px - 180px)' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Área de input */}
          <div className="px-6 pb-6 pt-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe tu pregunta sobre el examen EIR..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}




