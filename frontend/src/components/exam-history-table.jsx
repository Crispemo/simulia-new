import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Eye, Play } from 'lucide-react'

export default function ExamHistoryTable({ exams = [], onReviewClick, onResumeClick, getExamTypeName }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const examsPerPage = 6

  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams
    
    const term = searchTerm.toLowerCase()
    return exams.filter(exam => 
      (getExamTypeName(exam.type) || exam.type).toLowerCase().includes(term) ||
      new Date(exam.date).toLocaleDateString().includes(term)
    )
  }, [exams, searchTerm, getExamTypeName])

  const displayedExams = filteredExams.slice(
    currentPage * examsPerPage,
    (currentPage + 1) * examsPerPage
  )

  const calculateScore = (correct, incorrect) => {
    const aciertos = parseInt(correct) || 0
    const fallos = parseInt(incorrect) || 0
    return (aciertos * 3) - (fallos * 1)
  }

  const calculateBlank = (total, correct, incorrect) => {
    return total - (correct + incorrect)
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Historial de Exámenes</CardTitle>
        <Input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-4"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Fecha
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Tipo
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Preg.
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Correctas
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Incorrectas
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  En Blanco
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Puntuación
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {displayedExams.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay exámenes
                  </td>
                </tr>
              ) : (
                displayedExams.map((exam, index) => {
                  const totalQuestions = exam.totalQuestions || 0
                  const correct = exam.correct || 0
                  const incorrect = exam.incorrect || 0
                  const blank = calculateBlank(totalQuestions, correct, incorrect)
                  const score = calculateScore(correct, incorrect)
                  const timeInMinutes = Math.floor((exam.timeUsed || 0) / 60)

                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2 text-sm">
                        {new Date(exam.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {getExamTypeName(exam.type)}
                      </td>
                      <td className="px-4 py-2 text-center text-sm">{totalQuestions}</td>
                      <td className="px-4 py-2 text-center text-sm text-green-600">{correct}</td>
                      <td className="px-4 py-2 text-center text-sm text-red-600">
                        {incorrect}
                      </td>
                      <td className="px-4 py-2 text-center text-sm">{blank}</td>
                      <td
                        className={`px-4 py-2 text-center text-sm ${
                          score < 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {score.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {exam.status === 'completed' ? (
                          <Button variant="ghost" size="sm" onClick={() => onReviewClick(exam._id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => onResumeClick && onResumeClick(exam._id)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredExams.length > examsPerPage && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Página {currentPage + 1} de {Math.ceil(filteredExams.length / examsPerPage)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(
                    Math.min(
                      Math.ceil(filteredExams.length / examsPerPage) - 1,
                      currentPage + 1
                    )
                  )
                }
                disabled={
                  currentPage >= Math.ceil(filteredExams.length / examsPerPage) - 1
                }
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}





