"use client";

import { useEffect } from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure the dark theme is maintained during client-side rendering
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "min-h-screen bg-background font-sans antialiased";
    // Ensure dark mode is always set
    document.documentElement.classList.add("dark");
  }, []);

  return <div className="min-h-screen bg-background">{children}</div>;
}
