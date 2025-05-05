"use client"

import { LoadingProvider } from "@/contexts/loading-context"
import { LoadingBar } from "@/components/ui/loading-bar"
import { useLinkPrefetch } from "@/hooks/use-link-prefetch"
import { useEffect } from "react";

export default function ClientBody({ children }: { children: React.ReactNode }) {
  // Ensure the dark theme is maintained during client-side rendering
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "min-h-screen bg-background font-sans antialiased";
    // Ensure dark mode is always set
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <LoadingProvider>
      <LoadingBarWrapper>{children}</LoadingBarWrapper>
    </LoadingProvider>
  )
}

// Separate component to use hooks inside the provider
function LoadingBarWrapper({ children }: { children: React.ReactNode }) {
  // Enable link prefetching tracking
  useLinkPrefetch()
  
  return (
    <>
      <LoadingBar />
      <div className="min-h-screen bg-background">{children}</div>
    </>
  )
}