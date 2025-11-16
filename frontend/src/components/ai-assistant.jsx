import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Bot, Send, Loader2, X } from 'lucide-react'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'simulia_chat_history'
const MAX_HISTORY_LENGTH = 20 // Máximo de mensajes a guardar
const MAX_CHATGPT_HISTORY = 10 // Máximo de mensajes a enviar a ChatGPT

// Cargar historial desde localStorage
const loadChatHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convertir timestamps a Date objects
      return parsed.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }
  } catch (error) {
    console.warn('Error al cargar historial de chat:', error)
  }
  return [
    {
      text: "¡Hola! Soy el asistente de IA de Simulia. ¿En qué puedo ayudarte con tu preparación para el examen EIR?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]
}

// Guardar historial en localStorage
const saveChatHistory = (messages) => {
  try {
    // Guardar solo los últimos MAX_HISTORY_LENGTH mensajes
    const toSave = messages.slice(-MAX_HISTORY_LENGTH)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (error) {
    console.warn('Error al guardar historial de chat:', error)
  }
}

// Preguntas rápidas sugeridas
const quickQuestions = [
  "¿Cómo puedo mejorar en Farmacología?",
  "¿Qué es un simulacro EIR?",
  "¿Cómo revisar mis errores?",
  "¿Qué asignaturas puedo practicar?"
]

export default function AIAssistant() {
  const { currentUser } = useAuth()
  const userId = currentUser?.uid || null
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(loadChatHistory)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [userStats, setUserStats] = useState(null)
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

  // Guardar historial cuando cambien los mensajes
  useEffect(() => {
    if (messages.length > 1) { // Solo guardar si hay más que el mensaje inicial
      saveChatHistory(messages)
    }
  }, [messages])

  // Limpiar historial cuando se cierra el diálogo
  const handleDialogClose = (open) => {
    setIsOpen(open)
    if (!open) {
      setRetryCount(0)
    }
  }

  // Función para obtener estadísticas del usuario
  const fetchUserStats = async () => {
    if (!userId) return null
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/user-stats/${userId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const stats = await response.json()
        setUserStats(stats)
        return stats
      }
    } catch (error) {
      console.warn('Error al obtener estadísticas del usuario:', error)
    }
    return null
  }

  // Detectar si la pregunta requiere datos del usuario (expandido para ser más proactivo)
  const needsUserData = (input, conversationHistory = []) => {
    const progressKeywords = [
      'progreso', 'progresar', 'cómo voy', 'como voy', 'cómo estoy', 'como estoy', 
      'mi rendimiento', 'mi progreso', 'mis estadísticas', 'mis estadisticas', 
      'mis resultados', 'fallo mucho', 'fallo', 'fallos', 'errores', 
      'qué debería', 'que deberia', 'qué debo', 'que debo', 
      'debería practicar', 'deberia practicar', 'debo practicar', 
      'qué practicar', 'que practicar', 'dónde fallo', 'donde fallo', 
      'dónde fallo más', 'donde fallo mas', 'mis notas', 'mis netas',
      'cómo ves', 'como ves', 'qué me recomiendas', 'que me recomiendas',
      'mejora', 'mejorar', 'débil', 'debil', 'dificultad', 'dificultades',
      'asignatura', 'asignaturas', 'materia', 'materias'
    ]
    
    // Si menciona una asignatura específica, probablemente quiere saber sobre su progreso en esa área
    const temas = ['farma', 'farmacología', 'farmacologia', 'pediatría', 'pediatria', 
                   'geriatría', 'geriatria', 'quirúrgica', 'quirurgica', 'mental', 
                   'comunitaria', 'fundamentos', 'endocrinología', 'endocrinologia']
    const mencionaTema = temas.some(tema => input.includes(tema))
    
    // Si en la conversación anterior se habló de progreso o mejora, mantener el contexto
    const conversationText = conversationHistory.slice(-4).map(m => m.text).join(' ').toLowerCase()
    const contextoRelevante = conversationText.includes('progreso') || 
                              conversationText.includes('mejorar') || 
                              conversationText.includes('fallo') ||
                              conversationText.includes('error')
    
    return progressKeywords.some(keyword => input.includes(keyword)) || 
           (mencionaTema && contextoRelevante) ||
           input.includes('cómo') || input.includes('como')
  }

  const getBotResponse = (userInput, conversationHistory = []) => {
    const input = userInput.toLowerCase().trim()
    let response = ""

    // Analizar el historial de conversación para entender el contexto
    const recentMessages = conversationHistory.slice(-8) // Últimos 8 mensajes para contexto
    const conversationText = recentMessages.map(m => m.text).join(' ').toLowerCase()
    
    // Detectar temas mencionados en la conversación (expandido con más sinónimos)
    const temas = {
      farmacologia: ['farma', 'farmacología', 'farmacologia', 'medicamento', 'medicamentos', 'fármaco', 'farmaco', 'fármacos', 'farmacos', 'dosis', 'medicación', 'medicacion'],
      enfermeria: ['enfermería', 'enfermeria', 'cuidados', 'paciente', 'cuidado', 'enfermero', 'enfermera'],
      quirurgica: ['quirúrgica', 'quirurgica', 'quirúrgico', 'quirurgico', 'cirugía', 'cirugia', 'quirúrgicas', 'quirurgicas', 'operatorio', 'operatoria'],
      pediatria: ['pediatría', 'pediatria', 'niño', 'niños', 'infantil', 'pediátrico', 'pediatrico', 'niña', 'niñas'],
      geriatria: ['geriatría', 'geriatria', 'anciano', 'mayor', 'ancianos', 'mayores', 'geriátrico', 'geriatrico', 'tercera edad'],
      saludMental: ['salud mental', 'psiquiatría', 'psiquiatria', 'mental', 'psiquiátrico', 'psiquiatrico', 'psicología', 'psicologia'],
      comunitaria: ['comunitaria', 'comunidad', 'salud pública', 'salud publica', 'comunitario', 'comunitarios'],
      fundamentos: ['fundamentos', 'básicos', 'basicos', 'teoría', 'teoria', 'básico', 'basico', 'fundamental', 'fundamentales'],
      endocrinologia: ['endocrinología', 'endocrinologia', 'endocrino', 'hormona', 'hormonas', 'diabetes', 'tiroides'],
      administracion: ['administración', 'administracion', 'gestión', 'gestion', 'gestión', 'gestion', 'administrativo', 'administrativos']
    }

    // Detectar qué tema está mencionando el usuario (mejorado con scoring)
    let temaDetectado = null
    let maxScore = 0
    for (const [tema, palabras] of Object.entries(temas)) {
      const score = palabras.reduce((acc, palabra) => {
        if (input.includes(palabra)) return acc + 2 // Más peso si está en el mensaje actual
        if (conversationText.includes(palabra)) return acc + 1 // Menos peso si está en el historial
        return acc
      }, 0)
      if (score > maxScore) {
        maxScore = score
        temaDetectado = tema
      }
    }

    // Variaciones de respuestas para evitar repetición
    const saludos = [
      "¡Hola! ¿En qué puedo ayudarte hoy con tu preparación EIR?",
      "¡Hola! Estoy aquí para ayudarte con tu preparación para el examen EIR. ¿Qué necesitas?",
      "¡Hola! ¿Cómo puedo ayudarte con Simulia hoy?"
    ]

    const agradecimientos = [
      "¡De nada! Estoy aquí para ayudarte en todo lo que necesites.",
      "¡De nada! Cualquier otra duda, no dudes en preguntar.",
      "¡De nada! Estoy aquí siempre que me necesites."
    ]

    // Respuestas contextuales basadas en la conversación
    if (input.includes("hola") || input.includes("saludos") || input.includes("buenos días") || input.includes("hi") || input.includes("buenas")) {
      response = saludos[Math.floor(Math.random() * saludos.length)]
    } else if (input.includes("gracias") || input.includes("thank") || input.includes("gracias")) {
      response = agradecimientos[Math.floor(Math.random() * agradecimientos.length)]
    } else if (input.includes("mejorar") || input.includes("mejor") || input.includes("progresar")) {
      // Respuesta contextual sobre mejora
      if (temaDetectado === 'farmacologia') {
        response = "Para mejorar en Farmacología, te recomiendo: 1) Practicar con exámenes específicos de esta asignatura filtrando por 'Farmacología' al crear un examen, 2) Revisar tus errores en esta área usando la función 'Repite tus errores', 3) Estudiar los grupos farmacológicos más comunes en el EIR. ¿Te gustaría que te explique cómo crear un examen personalizado de Farmacología?"
      } else if (temaDetectado) {
        const nombreTema = temaDetectado === 'farmacologia' ? 'Farmacología' : 
                          temaDetectado === 'quirurgica' ? 'Enfermería Quirúrgica' :
                          temaDetectado === 'pediatria' ? 'Pediatría' :
                          temaDetectado === 'geriatria' ? 'Geriatría' :
                          temaDetectado === 'saludMental' ? 'Salud Mental' :
                          temaDetectado === 'comunitaria' ? 'Enfermería Comunitaria' :
                          temaDetectado === 'fundamentos' ? 'Fundamentos de Enfermería' : temaDetectado
        response = `Para mejorar en ${nombreTema}, puedes: 1) Crear exámenes personalizados filtrando por esta asignatura, 2) Revisar tus errores específicos en esta área, 3) Practicar con el modo contrarreloj para mejorar tu velocidad. ¿Quieres que te guíe en alguno de estos pasos?`
      } else {
        response = "Para mejorar tu rendimiento, te sugiero: 1) Practicar regularmente con simulacros completos, 2) Revisar tus errores usando la función 'Repite tus errores', 3) Analizar tu progreso en el dashboard para identificar áreas débiles, 4) Usar el modo contrarreloj para mejorar tu velocidad. ¿Sobre qué asignatura específica te gustaría mejorar?"
      }
    } else if (input.includes("examen") || input.includes("simulacro") || input.includes("prueba")) {
      response = "Puedes realizar un simulacro EIR completo de 175 preguntas o crear exámenes personalizados según las asignaturas que quieras practicar. También tienes opciones como el modo contrarreloj para mejorar tu velocidad."
    } else if (input.includes("asignatura") || input.includes("materia") || input.includes("tema") || input.includes("área")) {
      response = "Tenemos contenido para todas las asignaturas del EIR: Enfermería Médico-Quirúrgica, Fundamentos de Enfermería, Enfermería Comunitaria, Administración y Gestión, Pediatría, Geriatría, Salud Mental, Endocrinología, Farmacología, y muchas más. Puedes filtrar por asignatura al crear un examen."
    } else if (input.includes("estadística") || input.includes("progreso") || input.includes("rendimiento") || input.includes("resultado") || needsUserData(input)) {
      // Esta respuesta se reemplazará con datos reales si están disponibles
      response = "Puedes ver tu progreso en la sección 'Progreso' del dashboard. Allí encontrarás gráficos de rendimiento por asignaturas, tu evolución en el tiempo, y estadísticas detalladas de tus exámenes."
    } else if (input.includes("error") || input.includes("fallo") || input.includes("incorrecta")) {
      response = "La función 'Repite tus errores' te permite practicar específicamente con las preguntas que has fallado anteriormente. Esto te ayuda a mejorar en las áreas donde más dificultades tienes."
    } else if (input.includes("tiempo") || input.includes("contrarreloj") || input.includes("velocidad")) {
      response = "El modo 'Contrarreloj' te permite practicar con límite de tiempo (14 minutos para 30 preguntas) para mejorar tu velocidad de respuesta y simular las condiciones reales del examen."
    } else if (input.includes("comunidad") || input.includes("foro") || input.includes("chat") || input.includes("discusión")) {
      response = "Puedes acceder a nuestra comunidad haciendo clic en el botón 'Comunidad' en la barra superior. Allí podrás interactuar con otros estudiantes, compartir experiencias y resolver dudas."
    } else if (input.includes("suscripción") || input.includes("plan") || input.includes("precio") || input.includes("pago")) {
      response = "Tenemos planes de suscripción mensual y anual. Puedes consultar los detalles en la sección de suscripciones. Si tienes problemas con tu suscripción, contacta con nuestro equipo de soporte."
    } else if (input.includes("protocolo") || input.includes("protocolos")) {
      response = "Los exámenes de protocolos te permiten practicar con casos prácticos y protocolos de enfermería específicos. Son ideales para preparar la parte más práctica del examen EIR."
    } else if (input.includes("eir") || input.includes("enfermero interno residente")) {
      response = "El Examen de Enfermero Interno Residente (EIR) es una prueba competitiva para acceder a la especialización. En Simulia puedes prepararte con miles de preguntas, simulacros completos y seguimiento de tu progreso."
    } else if (temaDetectado) {
      // Respuesta contextual sobre el tema detectado
      const nombreTema = temaDetectado === 'farmacologia' ? 'Farmacología' : 
                        temaDetectado === 'quirurgica' ? 'Enfermería Quirúrgica' :
                        temaDetectado === 'pediatria' ? 'Pediatría' :
                        temaDetectado === 'geriatria' ? 'Geriatría' :
                        temaDetectado === 'saludMental' ? 'Salud Mental' :
                        temaDetectado === 'comunitaria' ? 'Enfermería Comunitaria' :
                        temaDetectado === 'fundamentos' ? 'Fundamentos de Enfermería' :
                        temaDetectado === 'endocrinologia' ? 'Endocrinología' :
                        temaDetectado === 'administracion' ? 'Administración y Gestión' : temaDetectado
      
      const respuestasTema = [
        `Sobre ${nombreTema}, puedes practicar creando un examen personalizado y filtrando por esta asignatura. También puedes revisar tus errores específicos en esta área. ¿Te gustaría saber cómo crear un examen de ${nombreTema}?`,
        `Para ${nombreTema}, te recomiendo crear exámenes personalizados de esta asignatura y revisar tus errores previos. ¿Quieres que te explique cómo hacerlo?`,
        `En ${nombreTema} puedes mejorar practicando con exámenes específicos de esta área. ¿Te ayudo a configurar un examen personalizado?`
      ]
      response = respuestasTema[Math.floor(Math.random() * respuestasTema.length)]
    } else {
      // Respuesta más inteligente basada en el contexto de la conversación
      const respuestasGenericas = [
        "Puedo ayudarte con información sobre exámenes, asignaturas, estadísticas, errores, o cualquier aspecto de la plataforma Simulia. ¿Sobre qué te gustaría saber más específicamente?",
        "Estoy aquí para ayudarte. Puedo explicarte sobre simulacros, asignaturas, tu progreso, errores, o cualquier función de Simulia. ¿Qué te interesa?",
        "¿En qué puedo ayudarte? Puedo darte información sobre exámenes, asignaturas, estadísticas, o cualquier otra función de la plataforma."
      ]
      
      if (conversationText.includes("mejorar") || conversationText.includes("ayuda")) {
        response = "Entiendo que necesitas ayuda. Puedo ayudarte con: crear exámenes personalizados, mejorar en asignaturas específicas, revisar tus errores, o entender cómo usar las funciones de la plataforma. ¿Sobre qué te gustaría saber más?"
      } else if (conversationText.length > 0) {
        response = "Veo que estamos hablando sobre tu preparación. ¿Te gustaría que te ayude con algo específico? Puedo ayudarte con exámenes, asignaturas, estadísticas, errores, o cualquier otra función de Simulia."
      } else {
        response = respuestasGenericas[Math.floor(Math.random() * respuestasGenericas.length)]
      }
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
    const input = messageText.toLowerCase()
    
    const userMessage = {
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    }
    
    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setIsLoading(true)

    // SIEMPRE obtener datos del usuario si está autenticado y la pregunta puede beneficiarse de datos
    // Ser más proactivo en el análisis de datos
    let stats = userStats
    if (userId) {
      // Obtener estadísticas siempre que sea relevante (no solo cuando se pregunta explícitamente)
      const shouldFetchStats = needsUserData(input, messages) || 
                               input.includes('mejorar') || 
                               input.includes('práctica') || 
                               input.includes('practica') ||
                               input.includes('recomend') ||
                               messages.length > 2 // Si hay conversación previa, tener datos disponibles
      
      if (shouldFetchStats) {
        stats = await fetchUserStats()
      }
    }

    // Llamar a la API de ChatGPT con el historial completo
    try {
      const token = localStorage.getItem('token')
      
      // Preparar contexto adicional con estadísticas del usuario si están disponibles
      // SIEMPRE incluir datos si están disponibles, no solo cuando se pregunta explícitamente
      let systemContext = ''
      if (stats) {
        const worstSubjects = stats.worstSubjects || []
        const general = stats.general || {}
        const bySubject = stats.bySubject || []
        
        // Buscar asignatura específica mencionada en la conversación
        const conversationText = messages.slice(-4).map(m => m.text).join(' ').toLowerCase()
        const temasMencionados = {
          'farmacología': ['farma', 'farmacología', 'farmacologia'],
          'pediatría': ['pediatría', 'pediatria'],
          'geriatría': ['geriatría', 'geriatria'],
          'quirúrgica': ['quirúrgica', 'quirurgica'],
          'salud mental': ['mental', 'psiquiatría', 'psiquiatria'],
          'comunitaria': ['comunitaria'],
          'fundamentos': ['fundamentos']
        }
        
        let asignaturaRelevante = null
        for (const [asignatura, keywords] of Object.entries(temasMencionados)) {
          if (keywords.some(kw => conversationText.includes(kw) || input.includes(kw))) {
            asignaturaRelevante = bySubject.find(s => 
              s.subject.toLowerCase().includes(asignatura.toLowerCase()) ||
              asignatura.toLowerCase().includes(s.subject.toLowerCase())
            )
            break
          }
        }
        
        systemContext = `\n\n=== DATOS DEL USUARIO (ANÁLISIS COMPLETO) ===

📊 RENDIMIENTO GENERAL:
- Exámenes completados: ${general.totalExams || 0}
- Preguntas respondidas: ${general.totalQuestions || 0}
- Tasa de acierto: ${general.successRate || 0}%
- Puntuación media: ${general.averageScore || 0} puntos

⚠️ ÁREAS DE MEJORA (Top 3 asignaturas con más errores):
${worstSubjects.length > 0 ? worstSubjects.map((s, i) => 
  `${i + 1}. ${s.subject}: ${s.errors} errores (${s.errorRate}% tasa de error)`
).join('\n') : 'Aún no hay datos suficientes para identificar áreas problemáticas.'}

${asignaturaRelevante ? `\n📌 ASIGNATURA MENCIONADA (${asignaturaRelevante.subject}):
- Errores: ${asignaturaRelevante.errors}
- Tasa de error: ${asignaturaRelevante.errorRate}%
- Tasa de acierto: ${asignaturaRelevante.successRate}%
- Total de preguntas: ${asignaturaRelevante.total}` : ''}

📚 RECURSOS DISPONIBLES:
- Preguntas falladas guardadas: ${stats.failedQuestions || 0}
- Preguntas sin contestar: ${stats.unansweredQuestions || 0}

=== INSTRUCCIONES PARA EL ASISTENTE ===
1. SIEMPRE analiza estos datos antes de responder
2. Sé un GUÍA proactivo: no solo respondas, SUGIERE acciones concretas basadas en los datos
3. Si el usuario pregunta sobre una asignatura específica, usa los datos de esa asignatura
4. Si hay áreas problemáticas, propón un plan de acción específico
5. Estructura tus respuestas de forma clara con:
   - Análisis de la situación actual
   - Recomendaciones específicas y accionables
   - Pasos concretos para mejorar
6. Sé empático pero directo: si hay problemas, identifícalos claramente
7. Ofrece soluciones prácticas, no solo información genérica`
      }
      
      // Optimizar historial: enviar solo los últimos mensajes relevantes a ChatGPT
      // Filtrar mensaje de bienvenida y tomar solo los últimos MAX_CHATGPT_HISTORY mensajes
      const filteredMessages = messages
        .filter(msg => msg.sender !== 'bot' || !msg.text.includes("¡Hola! Soy el asistente"))
        .slice(-MAX_CHATGPT_HISTORY) // Limitar historial para optimizar tokens
      
      const messagesToSend = [...filteredMessages, userMessage]
      
      const response = await fetch(`${API_URL}/ai-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ 
          message: messageText,
          messages: messagesToSend.slice(0, -1), // Enviar historial sin el último mensaje (ya está en message)
          ...(systemContext && { userContext: systemContext }) // Enviar contexto del usuario si está disponible
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Si la API indica que debe usarse fallback, usar respuestas inteligentes
        if (data.fallback) {
          throw new Error('API indica usar fallback')
        }
        
        let responseText = data.response || "Lo siento, no pude procesar tu mensaje."
        
        // Si tenemos estadísticas y la pregunta es sobre progreso, personalizar la respuesta
        if (stats && needsUserData(input)) {
          const worstSubjects = stats.worstSubjects || []
          const general = stats.general || {}
          
          // Si pregunta específicamente sobre qué debería practicar
          if (input.includes("qué debería") || input.includes("que deberia") || input.includes("qué debo") || input.includes("que debo") || input.includes("debería practicar") || input.includes("deberia practicar") || input.includes("debo practicar") || input.includes("qué practicar") || input.includes("que practicar")) {
            if (worstSubjects.length > 0) {
              responseText = `📊 **Análisis:** Basándome en tu progreso, estas son las asignaturas donde tienes más dificultades:\n\n${worstSubjects.map((s, i) => `**${i + 1}. ${s.subject}**\n   - ${s.errors} errores (${s.errorRate}% tasa de error)`).join('\n\n')}\n\n🎯 **Recomendación:** Enfócate en practicar estas áreas para mejorar tu rendimiento general.\n\n📝 **Plan de acción:**\n\n> 1. Crea en "Personalizado" un examen de 30 preguntas solo de ${worstSubjects[0].subject}\n\n> 2. Revisa con detenimiento las respuestas después de haber hecho el examen\n\n> 3. Te recomiendo practicar con el modo contrarreloj para mejorar velocidad\n\n> 4. Usa la función "Repite tus errores" para revisar las preguntas que has fallado en esta asignatura\n\n💡 **Consejo:** Practica de forma constante en estas áreas y verás mejoras significativas en 2-3 semanas.\n\n¿Te ayudo a configurar un examen personalizado de ${worstSubjects[0].subject}?`
            } else if (general.totalExams === 0) {
              responseText = `📊 **Análisis:** Aún no tienes exámenes completados para identificar tus áreas de mejora.\n\n🎯 **Recomendación:** Empieza con un simulacro completo para evaluar tu nivel inicial.\n\n📝 **Plan de acción:**\n\n> 1. Realiza un simulacro completo de 175 preguntas\n\n> 2. Revisa tus resultados y analiza en qué asignaturas tienes más dificultades\n\n> 3. Crea exámenes personalizados de 30 preguntas enfocados en las áreas que necesitas mejorar\n\n> 4. Practica regularmente y revisa tus errores\n\n💡 **Consejo:** El primer simulacro te dará una visión clara de tu nivel actual.\n\n¿Te ayudo a comenzar con un simulacro?`
            } else {
              responseText = `📊 **Análisis:** Tu rendimiento general es bueno. Mantén la práctica constante.\n\n🎯 **Recomendación:** Continúa mejorando con práctica dirigida.\n\n📝 **Plan de acción:**\n\n> 1. Sigue practicando con simulacros completos para mantener tu nivel\n\n> 2. Revisa tus errores usando la función "Repite tus errores"\n\n> 3. Crea exámenes personalizados de asignaturas específicas para profundizar\n\n> 4. Usa el modo contrarreloj para mejorar tu velocidad de respuesta\n\n💡 **Consejo:** La práctica constante es clave para mantener y mejorar tu rendimiento.\n\n¿Quieres que te ayude a crear un examen personalizado?`
            }
          }
          // Si pregunta sobre su progreso o cómo va
          else if (input.includes("progreso") || input.includes("cómo voy") || input.includes("como voy") || input.includes("cómo estoy") || input.includes("como estoy") || input.includes("mi rendimiento") || input.includes("mis notas") || input.includes("mis netas") || input.includes("cómo ves") || input.includes("como ves")) {
            if (general.totalExams > 0) {
              responseText = `📊 **Análisis de tu progreso:**\n\n**Rendimiento general:**\n- Exámenes completados: ${general.totalExams}\n- Preguntas respondidas: ${general.totalQuestions}\n- Tasa de acierto: ${general.successRate}%\n- Puntuación media: ${general.averageScore} puntos\n\n${worstSubjects.length > 0 ? `⚠️ **Áreas que requieren atención:**\n${worstSubjects.map(s => `• ${s.subject}: ${s.errors} errores (${s.errorRate}% tasa de error)`).join('\n')}\n\n🎯 **Recomendación:** Enfócate en estas asignaturas para mejorar tu rendimiento general.\n\n📝 **Plan de acción:**\n\n> 1. Crea en "Personalizado" exámenes de 30 preguntas enfocados en ${worstSubjects[0].subject}\n\n> 2. Revisa con detenimiento las respuestas después de cada examen\n\n> 3. Usa "Repite tus errores" para practicar específicamente las preguntas falladas\n\n> 4. Practica con el modo contrarreloj para mejorar tu velocidad\n\n💡 **Consejo:** La práctica constante en estas áreas te ayudará a mejorar significativamente.` : '✅ **¡Buen trabajo!** Tu rendimiento general es sólido.\n\n🎯 **Recomendación:** Mantén la práctica regular para seguir mejorando.\n\n📝 **Plan de acción:**\n\n> 1. Continúa con simulacros completos para mantener tu nivel\n\n> 2. Revisa tus errores periódicamente usando "Repite tus errores"\n\n> 3. Crea exámenes personalizados de asignaturas específicas para profundizar\n\n> 4. Practica con el modo contrarreloj para optimizar tu velocidad\n\n💡 **Consejo:** La consistencia es clave para mantener un buen rendimiento.'}\n\n¿Quieres que te ayude a crear un examen personalizado?`
            } else {
              responseText = `📊 **Análisis:** Aún no tienes exámenes completados para analizar tu progreso.\n\n🎯 **Recomendación:** Empieza con un simulacro completo para evaluar tu nivel inicial.\n\n📝 **Plan de acción:**\n\n> 1. Realiza un simulacro completo de 175 preguntas\n\n> 2. Revisa tus resultados y analiza en qué asignaturas tienes más dificultades\n\n> 3. Crea exámenes personalizados de 30 preguntas enfocados en las áreas que necesitas mejorar\n\n> 4. Revisa con detenimiento las respuestas después de cada examen\n\n💡 **Consejo:** El primer simulacro te dará una visión clara de tu nivel actual y te ayudará a planificar tu estudio.\n\n¿Te ayudo a comenzar con un simulacro?`
            }
          }
          // Si pregunta sobre dónde falla más
          else if (input.includes("dónde fallo") || input.includes("donde fallo") || input.includes("fallo mucho") || input.includes("fallo mas") || input.includes("fallo más")) {
            if (worstSubjects.length > 0) {
              responseText = `📊 **Análisis:** Estas son las asignaturas donde más fallas:\n\n${worstSubjects.slice(0, 3).map((s, i) => `**${i + 1}. ${s.subject}**\n   - ${s.errors} errores (${s.errorRate}% tasa de error)`).join('\n\n')}\n\n🎯 **Recomendación:** Enfócate en practicar estas áreas para mejorar tu rendimiento.\n\n📝 **Plan de acción:**\n\n> 1. Crea en "Personalizado" un examen de 30 preguntas solo de ${worstSubjects[0].subject}\n\n> 2. Revisa con detenimiento las respuestas después de haber hecho el examen\n\n> 3. Te recomiendo practicar con el modo contrarreloj para mejorar velocidad\n\n> 4. Usa "Repite tus errores" para revisar específicamente las ${worstSubjects[0].errors} preguntas que has fallado en ${worstSubjects[0].subject}\n\n💡 **Consejo:** La práctica constante en estas asignaturas te ayudará a reducir significativamente tus errores.\n\n¿Quieres que te ayude a crear un examen de ${worstSubjects[0].subject}?`
            } else {
              responseText = `📊 **Análisis:** Aún no tienes suficientes datos para identificar tus áreas más débiles.\n\n🎯 **Recomendación:** Completa algunos exámenes para obtener datos de tu rendimiento.\n\n📝 **Plan de acción:**\n\n> 1. Realiza un simulacro completo de 175 preguntas\n\n> 2. Completa al menos 2-3 exámenes personalizados de diferentes asignaturas\n\n> 3. Revisa tus resultados para identificar patrones\n\n> 4. Una vez tengas datos, podré darte recomendaciones más específicas\n\n💡 **Consejo:** Cuantos más exámenes completes, más precisa será mi análisis de tus áreas de mejora.\n\n¿Te ayudo a empezar con un simulacro?`
            }
          }
        }
        
        const botResponse = {
          text: responseText,
          sender: "bot",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, botResponse])
        setIsLoading(false)
      } else {
        // Intentar leer el error de la respuesta
        try {
          const errorData = await response.json()
          if (errorData.fallback) {
            throw new Error('API no disponible, usando fallback')
          }
        } catch {
          // Si no se puede leer el error, usar fallback
        }
        throw new Error('API no disponible, usando fallback')
      }
    } catch (error) {
      // Manejo mejorado de errores con reintentos
      const isNetworkError = error.message?.includes('CORS') || 
                            error.message?.includes('Failed to fetch') ||
                            error.message?.includes('NetworkError')
      
      if (!isNetworkError) {
        console.warn('ChatGPT no disponible, usando respuestas inteligentes:', error.message)
      }
      
      // Usar sistema de respuestas inteligentes como fallback con contexto
      let botResponse = getBotResponse(messageText, messages)
      
      // Si tenemos estadísticas y la pregunta es sobre progreso, personalizar la respuesta del fallback también
      if (stats && needsUserData(input)) {
        const worstSubjects = stats.worstSubjects || []
        const general = stats.general || {}
        
        if (input.includes("qué debería") || input.includes("que deberia") || input.includes("debería practicar") || input.includes("deberia practicar")) {
          if (worstSubjects.length > 0) {
            botResponse.text = `📊 **Análisis:** Basándome en tu progreso, estas asignaturas requieren más atención:\n\n${worstSubjects.map((s, i) => `**${i + 1}. ${s.subject}**: ${s.errors} errores (${s.errorRate}% tasa de error)`).join('\n')}\n\n🎯 **Recomendación:** Enfócate en practicar estas áreas.\n\n📝 **Plan de acción:**\n\n> 1. Crea en "Personalizado" un examen de 30 preguntas solo de ${worstSubjects[0].subject}\n\n> 2. Revisa con detenimiento las respuestas después de haber hecho el examen\n\n> 3. Te recomiendo practicar con el modo contrarreloj para mejorar velocidad\n\n💡 **Consejo:** La práctica constante en estas asignaturas mejorará tu rendimiento.`
          }
        } else if (input.includes("progreso") || input.includes("cómo voy") || input.includes("como voy") || input.includes("mis notas") || input.includes("mis netas")) {
          if (general.totalExams > 0) {
            botResponse.text = `📊 **Análisis:** Tu progreso actual:\n- Exámenes completados: ${general.totalExams}\n- Tasa de acierto: ${general.successRate}%\n- Puntuación media: ${general.averageScore} puntos\n\n${worstSubjects.length > 0 ? `⚠️ **Áreas a mejorar:** ${worstSubjects.map(s => s.subject).join(', ')}\n\n📝 **Plan de acción:**\n\n> 1. Crea exámenes personalizados de estas asignaturas\n\n> 2. Revisa tus errores usando "Repite tus errores"\n\n> 3. Practica con el modo contrarreloj` : '✅ ¡Buen trabajo! Mantén la práctica constante.'}`
          }
        }
      }
      
      setTimeout(() => {
        setMessages((prev) => [...prev, botResponse])
        setIsLoading(false)
        setRetryCount(0) // Resetear contador de reintentos
      }, 800)
    }
  }

  // Función para usar una pregunta rápida
  const handleQuickQuestion = (question) => {
    if (isLoading) return
    setInputText(question)
    // Simular envío después de un breve delay para que el input se actualice
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} }
      handleSendMessage(fakeEvent)
    }, 50)
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

      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Asistente de IA - Simulia
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDialogClose(false)}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          {/* Área de mensajes con scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(600px - 180px)' }}>
            {/* Mostrar sugerencias rápidas solo si hay pocos mensajes */}
            {messages.length <= 2 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preguntas rápidas:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      disabled={isLoading}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
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




