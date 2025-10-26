import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Bot } from 'lucide-react'

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!message.trim()) return

    setIsLoading(true)
    // TODO: Implementar llamada a API de IA
    setTimeout(() => {
      setIsLoading(false)
      setMessage('')
      // Cerrar el modal después de enviar
      setIsOpen(false)
    }, 1000)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Bot className="mr-2 h-4 w-4" />
        Asistente IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asistente de IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Escribe tu pregunta sobre el examen EIR..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()}>
                {isLoading ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

