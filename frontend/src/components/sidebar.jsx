import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import {
  PanelLeft,
  FileText,
  Clock,
  Target,
  Timer,
  GraduationCap,
  Flame,
  CreditCard,
  Menu,
  X,
  MessageSquare,
  FolderOpen,
  Users,
  AlertCircle,
  Heart,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import TicketModal from './TicketModal'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: PanelLeft, path: '/dashboard' },
  { id: 'simulacro', label: 'Simulacro EIR', icon: FileText, path: '/exam' },
  { id: 'quizz', label: 'Quizz', icon: Clock, path: '/Quizz' },
  { id: 'errores', label: 'Repite Errores', icon: Target, path: '/errores' },
  { id: 'protocolos', label: 'Protocolario', icon: GraduationCap, path: '/protocolos' },
  { id: 'contrarreloj', label: 'Contrarreloj', icon: Timer, path: '/Contrarreloj' },
  { id: 'personalizado', label: 'Personalizado', icon: Flame, path: '/examenEleccion' },
]

export default function Sidebar({ isCollapsed, toggleCollapsed, isDarkMode, toggleDarkMode, onTutorialClick, onResourcesClick, onSurveyClick }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()
  const userId = currentUser?.uid || null

  const handleNavigate = (path) => {
    localStorage.removeItem('userAnswers')
    localStorage.removeItem('progresoExamen')
    navigate(path)
    setIsMobileOpen(false)
  }

  const handleResourcesClick = () => {
    if (onResourcesClick) {
      onResourcesClick()
    } else {
      console.warn('onResourcesClick no está definido en el Sidebar')
    }
    setIsMobileOpen(false)
  }

  const handleSettingsClick = () => {
    window.location.href = "https://billing.stripe.com/p/login/28o3fr7yb4GQ5sk288"
  }

  const handleCommunityClick = () => {
    window.open('https://t.me/+GqghWP8AchIzOGNk', '_blank', 'noopener,noreferrer')
    setIsMobileOpen(false)
  }

  const handleTicketClick = () => {
    setShowTicketModal(true)
    setIsMobileOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-background"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40',
          isCollapsed ? 'w-16' : 'w-64',
          'hidden md:block'
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className={cn('flex items-center gap-2 mb-8', isCollapsed && 'justify-center')}>
            <img
              src="/Logo_oscuro.png"
              alt="Logo"
              className="h-8 w-8"
            />
            {!isCollapsed && <h1 className="font-bold text-lg">Simulia</h1>}
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Settings */}
          <div className="border-t pt-4">
            {onSurveyClick && (
              <button
                onClick={onSurveyClick}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all mb-2',
                  isCollapsed && 'justify-center'
                )}
              >
                <Heart className="h-5 w-5 text-pink-500" />
                {!isCollapsed && <span className="text-pink-500">¡Cuéntame qué tal!</span>}
              </button>
            )}
            {onTutorialClick && (
              <button
                onClick={onTutorialClick}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all mb-2',
                  isCollapsed && 'justify-center'
                )}
              >
                <MessageSquare className="h-5 w-5" />
                {!isCollapsed && <span>Tutorial</span>}
              </button>
            )}
            <button
              onClick={handleResourcesClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all mb-2',
                isCollapsed && 'justify-center'
              )}
            >
              <FolderOpen className="h-5 w-5" />
              {!isCollapsed && <span>Recursos</span>}
            </button>
            <button
              onClick={handleCommunityClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all mb-2',
                isCollapsed && 'justify-center'
              )}
            >
              <Users className="h-5 w-5" />
              {!isCollapsed && <span>Comunidad</span>}
            </button>
            <button
              onClick={handleTicketClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all mb-2',
                isCollapsed && 'justify-center'
              )}
            >
              <AlertCircle className="h-5 w-5" />
              {!isCollapsed && <span>Incidencias</span>}
            </button>
            <button
              onClick={handleSettingsClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all',
                isCollapsed && 'justify-center'
              )}
            >
              <CreditCard className="h-5 w-5" />
              {!isCollapsed && <span>Pago y suscripción</span>}
            </button>

            <button
              onClick={toggleCollapsed}
              className={cn(
                'w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all',
                isCollapsed && 'justify-center'
              )}
            >
              <PanelLeft className="h-5 w-5" />
              {!isCollapsed && <span>Colapsar</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed left-0 top-0 h-screen bg-card border-r border-border w-64 z-40 transition-transform duration-300 md:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-2 mb-8">
            <img src="/Logo_oscuro.png" alt="Logo" className="h-8 w-8" />
            <h1 className="font-bold text-lg">Simulia</h1>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="border-t pt-4">
            {onSurveyClick && (
              <button
                onClick={onSurveyClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mb-2"
              >
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="text-pink-500">¡Cuéntame qué tal!</span>
              </button>
            )}
            {onTutorialClick && (
              <button
                onClick={onTutorialClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mb-2"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Tutorial</span>
              </button>
            )}
            <button
              onClick={handleResourcesClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mb-2"
            >
              <FolderOpen className="h-5 w-5" />
              <span>Recursos</span>
            </button>
            <button
              onClick={handleCommunityClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mb-2"
            >
              <Users className="h-5 w-5" />
              <span>Comunidad</span>
            </button>
            <button
              onClick={handleTicketClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mb-2"
            >
              <AlertCircle className="h-5 w-5" />
              <span>Incidencias</span>
            </button>
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"
            >
              <CreditCard className="h-5 w-5" />
              <span>Pago y suscripción</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Tickets/Incidencias */}
      <TicketModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        userId={userId}
      />
    </>
  )
}





