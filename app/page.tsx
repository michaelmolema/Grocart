"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"

export default function Home() {
  const [supabaseStatus, setSupabaseStatus] = useState<"loading" | "connected" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showLogo, setShowLogo] = useState(false)
  const [showText, setShowText] = useState(false)
  const [logoRotated, setLogoRotated] = useState(false)
  const [isRotating, setIsRotating] = useState(false)

  useEffect(() => {
    async function checkSupabaseConnection() {
      try {
        console.log("Supabase verbinding testen...")
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Fout bij het testen van de Supabase verbinding:", error)
          setSupabaseStatus("error")
          setErrorMessage(error.message)
        } else {
          console.log("Supabase verbinding succesvol getest")
          setSupabaseStatus("connected")
        }
      } catch (err) {
        console.error("Onverwachte fout bij het testen van de Supabase verbinding:", err)
        setSupabaseStatus("error")
        setErrorMessage(err instanceof Error ? err.message : "Onbekende fout")
      }
    }

    checkSupabaseConnection()

    // Start the animations after component mount
    const logoTimer = setTimeout(() => setShowLogo(true), 300)
    const textTimer = setTimeout(() => setShowText(true), 800)

    // Start the rotation animation after the logo appears
    const rotationTimer = setTimeout(() => {
      setLogoRotated(true)
      // Reset the rotation state after animation completes
      setTimeout(() => setLogoRotated(false), 800)
    }, 500)

    return () => {
      clearTimeout(logoTimer)
      clearTimeout(textTimer)
      clearTimeout(rotationTimer)
    }
  }, [])

  const handleLogoClick = () => {
    if (!isRotating) {
      setIsRotating(true)
      // Reset the rotation state after animation completes
      setTimeout(() => setIsRotating(false), 800)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-2">
      <div
        className={`w-52 h-52 relative mb-0 transform transition-all duration-1000 ease-out cursor-pointer ${
          showLogo ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
        } ${logoRotated || isRotating ? "animate-spin-once" : ""}`}
        onClick={handleLogoClick}
      >
        <Image src="/logo-new.png" alt="The Kitchen Kit Logo" fill priority className="object-contain" />
      </div>

      <div
        className={`text-center transform transition-all duration-1000 ease-out ${
          showText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h1 className="text-xl md:text-2xl font-light tracking-wide text-black mb-0">Mealplanning</h1>
        <h1 className="text-xl md:text-2xl font-light tracking-wide text-black">& Groceries</h1>
      </div>

      {supabaseStatus === "loading" && (
        <div className="text-center text-gray-500 mt-8">
          <p>Connecting to the database...</p>
        </div>
      )}

      {supabaseStatus === "error" && (
        <div className="text-center text-red-500 mt-8 p-4 border border-red-300 rounded-md bg-red-50">
          <p className="font-bold">Error connecting to the database:</p>
          <p>{errorMessage || "Unknown error"}</p>
        </div>
      )}
    </div>
  )
}
