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
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { API_URL } from '../config'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: PanelLeft, path: '/dashboard' },
  { id: 'simulacro', label: 'Simulacro EIR', icon: FileText, path: '/exam' },
  { id: 'quizz', label: 'Quizz', icon: Clock, path: '/Quizz' },
  { id: 'errores', label: 'Repite Errores', icon: Target, path: '/errores' },
  { id: 'protocolos', label: 'Protocolario', icon: GraduationCap, path: '/protocolos' },
  { id: 'contrarreloj', label: 'Contrarreloj', icon: Timer, path: '/Contrarreloj' },
  { id: 'personalizado', label: 'Personalizado', icon: Flame, path: '/examenEleccion' },
]

export default function Sidebar({ isCollapsed, toggleCollapsed, isDarkMode, toggleDarkMode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigate = (path) => {
    localStorage.removeItem('userAnswers')
    localStorage.removeItem('progresoExamen')
    navigate(path)
    setIsMobileOpen(false)
  }

  const handleSettingsClick = () => {
    window.location.href = "https://billing.stripe.com/p/login/28o3fr7yb4GQ5sk288"
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
            <button
              onClick={handleSettingsClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-all',
                isCollapsed && 'justify-center'
              )}
            >
              <Settings className="h-5 w-5" />
              {!isCollapsed && <span>Configuración</span>}
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
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"
            >
              <Settings className="h-5 w-5" />
              <span>Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}





