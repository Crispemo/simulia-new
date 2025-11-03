import React from 'react'
import { Card, CardContent } from './ui/card'
import { cn } from '../lib/utils'
import { Flame } from 'lucide-react'

export default function StreakCounter({ streak = 0, label, textColor = "#7ea0a7" }) {
  return (
    <div className="rounded-xl border border-accent p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-accent/10 p-1">
          <Flame className="h-4 w-4" style={{ color: textColor }} />
        </div>
        <div>
          <p className="text-xs leading-none text-muted-foreground">{label}</p>
          <p className="font-semibold" style={{ color: textColor }}>
            {streak} {streak === 1 ? 'día' : 'días'}
          </p>
        </div>
      </div>
    </div>
  )
}




