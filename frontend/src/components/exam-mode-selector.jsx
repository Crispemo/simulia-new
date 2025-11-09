import React from 'react'
import { Card } from './ui/card'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  FileText,
  Timer,
  Target,
  GraduationCap,
  Flame,
} from 'lucide-react'

const examModes = [
  {
    id: 'simulacro',
    label: 'Simulacro EIR',
    description: '175 preguntas en 4 horas',
    icon: FileText,
    color: '#3b82f6',
  },
  {
    id: 'quizz',
    label: 'Quizz Rápido',
    description: '50 preguntas en 30 min',
    icon: Clock,
    color: '#10b981',
  },
  {
    id: 'errores',
    label: 'Repite Errores',
    description: 'Tus preguntas falladas',
    icon: Target,
    color: '#f59e0b',
  },
  {
    id: 'protocolos',
    label: 'Protocolario',
    description: 'Enfocado en protocolos',
    icon: GraduationCap,
    color: '#8b5cf6',
  },
  {
    id: 'contrarreloj',
    label: 'Contrarreloj',
    description: '30 preguntas en 15 min',
    icon: Timer,
    color: '#ef4444',
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    description: 'Diseña tu examen',
    icon: Flame,
    color: '#ec4899',
  },
]

export default function ExamModeSelector() {
  const navigate = useNavigate()

  const handleModeClick = (mode) => {
    localStorage.removeItem('userAnswers')
    localStorage.removeItem('progresoExamen')
    
    switch (mode.id) {
      case 'simulacro':
        navigate('/exam')
        break
      case 'quizz':
        navigate('/Quizz')
        break
      case 'errores':
        navigate('/errores')
        break
      case 'protocolos':
        navigate('/protocolos')
        break
      case 'contrarreloj':
        navigate('/Contrarreloj')
        break
      case 'personalizado':
        navigate('/examenEleccion')
        break
      default:
        break
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {examModes.map((mode) => (
        <Card
          key={mode.id}
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => handleModeClick(mode)}
        >
          <div className="flex items-center gap-3 p-4">
            <div
              className="rounded-lg p-2"
              style={{ backgroundColor: `${mode.color}15` }}
            >
              <mode.icon
                className="h-6 w-6"
                style={{ color: mode.color }}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{mode.label}</h3>
              <p className="text-xs text-muted-foreground">
                {mode.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}





