"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const [animationComplete, setAnimationComplete] = useState(false)

  useEffect(() => {
    // Trigger animation after component mounts
    setAnimationComplete(true)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex flex-col items-center justify-center gap-6 max-w-md text-center">
        <div className="relative w-48 h-48">
          <Image
            src="/grocart-logo.png"
            alt="GROCART Logo"
            fill
            priority
            className={cn(
              "object-contain transition-transform duration-700",
              animationComplete ? "rotate-0" : "-rotate-180",
            )}
          />
        </div>

        <h1
          className={cn(
            "text-3xl font-bold transition-opacity duration-1000",
            animationComplete ? "opacity-100" : "opacity-0",
          )}
        >
          GROCART
        </h1>
      </div>
    </div>
  )
}
