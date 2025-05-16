"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"

export default function DebugPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<"loading" | "connected" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({})
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    // Verzamel omgevingsvariabelen
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "***" : undefined,
    })

    // Test Supabase verbinding
    async function checkSupabaseConnection() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          setSupabaseStatus("error")
          setErrorMessage(error.message)
        } else {
          setSupabaseStatus("connected")
        }
      } catch (err) {
        setSupabaseStatus("error")
        setErrorMessage(err instanceof Error ? err.message : "Onbekende fout")
      }
    }

    checkSupabaseConnection()
  }, [])

  const testDatabaseConnection = async () => {
    try {
      setTestResult("Test uitvoeren...")

      // Test een eenvoudige query
      const { data, error } = await supabase.from("recipes").select("count").single()

      if (error) {
        setTestResult(`Fout bij het testen van de database: ${error.message}`)
      } else {
        setTestResult(`Database verbinding succesvol! Aantal recepten: ${data?.count || 0}`)
      }
    } catch (err) {
      setTestResult(`Onverwachte fout: ${err instanceof Error ? err.message : "Onbekende fout"}`)
    }
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Debug Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Supabase Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                Status:{" "}
                {supabaseStatus === "connected"
                  ? "✅ Connected"
                  : supabaseStatus === "loading"
                    ? "⏳ Loading..."
                    : "❌ Error"}
              </p>
              {errorMessage && <p className="text-red-500">{errorMessage}</p>}

              <Button onClick={testDatabaseConnection} className="mt-4">
                Test Database Connection
              </Button>

              {testResult && (
                <div
                  className={`mt-4 p-3 rounded ${testResult.includes("Fout") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                >
                  {testResult}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span>{value || "Not set"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Browser Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>User Agent: {typeof window !== "undefined" ? window.navigator.userAgent : "Not available"}</p>
              <p>
                Viewport:{" "}
                {typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Not available"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
