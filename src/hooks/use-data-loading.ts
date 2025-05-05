"use client"

import { useEffect } from "react"
import { useLoading } from "@/contexts/loading-context"

export function useDataLoading(isLoading: boolean) {
  const { startLoading, stopLoading } = useLoading()
  
  useEffect(() => {
    if (isLoading) {
      startLoading()
    } else {
      stopLoading()
    }
  }, [isLoading, startLoading, stopLoading])
}