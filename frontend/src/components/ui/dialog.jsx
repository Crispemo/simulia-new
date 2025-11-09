import * as React from "react"
import { cn } from "../../lib/utils"

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 bg-background rounded-lg shadow-lg p-6 max-w-lg w-full mx-4">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { onClose: () => onOpenChange?.(false) })
          }
          return child
        })}
      </div>
    </div>
  )
}

const DialogContent = React.forwardRef(({ className, children, onClose, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props}>
    {children}
  </div>
))

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
))

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))

Dialog.displayName = "Dialog"
DialogContent.displayName = "DialogContent"
DialogHeader.displayName = "DialogHeader"
DialogTitle.displayName = "DialogTitle"
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription }





