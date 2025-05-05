"use client"
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from 'react'

type LoadingContextType = {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
  progress: number
}

type RouteChangeListenerProps = {
  onRouteChange: (newPath: string) => void
}

// Extract route change detection to a separate component
function RouteChangeListener({ onRouteChange }: RouteChangeListenerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Create the full path string with search params
  const currentPathWithParams = pathname + searchParams.toString()
  
  // Notify parent component when the path changes
  useEffect(() => {
    onRouteChange(currentPathWithParams)
  }, [pathname, searchParams, currentPathWithParams, onRouteChange])
  
  return null // This component doesn't render anything
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [prevPathWithParams, setPrevPathWithParams] = useState("")

  // Function to start loading
  const startLoading = useCallback(() => {
    setIsLoading(true)
    setProgress(0)
  }, [])

  // Function to stop loading
  const stopLoading = useCallback(() => {
    setProgress(100)
    // Short delay before hiding the bar
    setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
    }, 400)
  }, [])

  // Handle path changes detected by the RouteChangeListener
  const handleRouteChange = useCallback((newPath: string) => {
    // If this is not the initial render and the path has changed
    if (prevPathWithParams && prevPathWithParams !== newPath) {
      startLoading()
      // End loading animation after a delay (fallback in case events don't trigger)
      const timeout = setTimeout(() => {
        stopLoading()
      }, 1000)
      return () => clearTimeout(timeout)
    }
    // Update the previous path
    setPrevPathWithParams(newPath)
  }, [prevPathWithParams, startLoading, stopLoading])

  // Increment progress during loading
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isLoading && progress < 90) {
      interval = setInterval(() => {
        setProgress((prevProgress) => {
          // Slower increments as we approach 90%
          const increment = prevProgress < 30 ? 8 : prevProgress < 60 ? 4 : 1
          return Math.min(prevProgress + increment, 90)
        })
      }, 150)
      return () => clearInterval(interval)
    }
  }, [isLoading, progress])

  // Listen for browser's native navigation events
  useEffect(() => {
    const handleStart = () => startLoading()
    const handleStop = () => stopLoading()
    
    window.addEventListener('beforeunload', handleStart)
    // Many modern frameworks dispatch these custom events
    window.addEventListener('router:fetching', handleStart)
    window.addEventListener('router:loaded', handleStop)
    
    return () => {
      window.removeEventListener('beforeunload', handleStart)
      window.removeEventListener('router:fetching', handleStart)
      window.removeEventListener('router:loaded', handleStop)
    }
  }, [startLoading, stopLoading])

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, progress }}>
      {/* Wrap the route change listener in Suspense */}
      <Suspense fallback={null}>
        <RouteChangeListener onRouteChange={handleRouteChange} />
      </Suspense>
      
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}