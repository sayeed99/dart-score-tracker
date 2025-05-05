"use client"

import { useState, useEffect } from "react"
import { useLoading } from "@/contexts/loading-context"

export function useLinkPrefetch() {
  const [prefetchLinks, setPrefetchLinks] = useState<Set<HTMLAnchorElement>>(new Set())
  const { startLoading, stopLoading } = useLoading()
  
  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const link = e.currentTarget as HTMLAnchorElement
      if (link.dataset.prefetched !== "true" && link.getAttribute("href")?.startsWith("/")) {
        setPrefetchLinks((prev) => new Set(prev).add(link))
        link.dataset.prefetched = "true"
        startLoading()
        
        // Simulate prefetch completion
        setTimeout(() => {
          stopLoading()
        }, 300)
      }
    }
    
    // Add listeners to all internal links
    const links = document.querySelectorAll('a[href^="/"]') as NodeListOf<HTMLAnchorElement>
    links.forEach((link) => {
      link.addEventListener("mouseenter", handleMouseEnter)
    })
    
    return () => {
      links.forEach((link) => {
        link.removeEventListener("mouseenter", handleMouseEnter)
      })
    }
  }, [startLoading, stopLoading])
}