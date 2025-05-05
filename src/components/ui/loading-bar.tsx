"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useLoading } from "@/contexts/loading-context"

// Using React.HTMLAttributes directly instead of an empty interface
export function LoadingBar({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  const { progress, isLoading } = useLoading()
  
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 h-1 z-50",
        className
      )} 
      {...props}
    >
      <div 
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          opacity: isLoading || progress > 0 ? 1 : 0
        }}
      />
    </div>
  )
}