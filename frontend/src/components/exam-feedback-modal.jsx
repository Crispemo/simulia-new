import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function ExamFeedbackModal({ open, onClose, examData }) {
  if (!examData) return null

  const calculateScore = (correct, incorrect) => {
    const aciertos = parseInt(correct) || 0
    const fallos = parseInt(incorrect) || 0
    return (aciertos * 3) - (fallos * 1)
  }

  const totalQuestions = examData.totalQuestions || 0
  const correct = examData.correct || 0
  const incorrect = examData.incorrect || 0
  const blank = totalQuestions - (correct + incorrect)
  const score = calculateScore(correct, incorrect)
  const percentage = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resultados del Examen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{score.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Puntuación final</p>
          </div>

          <Progress value={percentage} className="h-3" />

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center rounded-lg border p-4">
              <CheckCircle2 className="mb-2 h-6 w-6 text-green-600" />
              <div className="text-2xl font-bold">{correct}</div>
              <div className="text-xs text-muted-foreground">Correctas</div>
            </div>
            <div className="flex flex-col items-center rounded-lg border p-4">
              <XCircle className="mb-2 h-6 w-6 text-red-600" />
              <div className="text-2xl font-bold">{incorrect}</div>
              <div className="text-xs text-muted-foreground">Incorrectas</div>
            </div>
            <div className="flex flex-col items-center rounded-lg border p-4">
              <Clock className="mb-2 h-6 w-6 text-muted-foreground" />
              <div className="text-2xl font-bold">{blank}</div>
              <div className="text-xs text-muted-foreground">En Blanco</div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

