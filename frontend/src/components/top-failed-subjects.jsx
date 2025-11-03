import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { TrendingDown } from 'lucide-react'

export default function TopFailedSubjects({ data = [], onPracticeClick }) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Materias con más fallos</CardTitle>
        <TrendingDown className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {data.map((item, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {item.name} ({item.count})
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Haz clic en una materia para practicar
        </p>
      </CardContent>
    </Card>
  )
}




