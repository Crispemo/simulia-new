import * as React from "react"
import { cn } from "../../lib/utils"

const Tabs = React.forwardRef(({ className, defaultValue, value, onChange, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || "")
  const activeValue = value !== undefined ? value : internalValue
  
  const handleChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    if (onChange) {
      onChange(newValue)
    }
  }
  
  return (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeValue, handleChange })
        }
        return child
      })}
    </div>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef(({ className, activeValue, handleChange, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, activeValue, handleChange, ...props }, ref) => {
  const isActive = activeValue === value
  const onClickHandler = () => {
    if (handleChange && typeof handleChange === 'function') {
      handleChange(value)
    }
  }
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/50",
        className
      )}
      onClick={onClickHandler}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, activeValue, ...props }, ref) => {
  if (value !== activeValue) {
    return null
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

