"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { createRecipe } from "@/lib/supabase"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function RecipeDebugPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<"loading" | "connected" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isCreatingTestRecipe, setIsCreatingTestRecipe] = useState(false)
  const [testRecipeId, setTestRecipeId] = useState<string | null>(null)

  useEffect(() => {
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

  const createTestRecipe = async () => {
    try {
      setIsCreatingTestRecipe(true)
      setTestResult("Test recept aanmaken...")

      const recipe = await createRecipe(
        "Test Recipe " + new Date().toISOString(),
        "This is a test recipe created for debugging purposes.",
        "blue",
      )

      if (recipe) {
        setTestResult(`Test recept succesvol aangemaakt met ID: ${recipe.id}`)
        setTestRecipeId(recipe.id)
      } else {
        setTestResult("Er is een fout opgetreden bij het aanmaken van het test recept")
      }
    } catch (err) {
      setTestResult(`Fout bij het aanmaken van test recept: ${err instanceof Error ? err.message : "Onbekende fout"}`)
    } finally {
      setIsCreatingTestRecipe(false)
    }
  }

  return (
    <div className="py-6">
      <div className="flex items-center mb-6">
        <Link href="/recepten" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Recipe Debug Page</h1>
      </div>

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
                  className={`mt-4 p-3 rounded ${
                    testResult.includes("Fout") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  }`}
                >
                  {testResult}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Recipe Creation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Test het aanmaken van een recept om te controleren of de createRecipe functie correct werkt. Dit maakt
                een eenvoudig testrecept aan in de database.
              </p>

              <Button onClick={createTestRecipe} disabled={isCreatingTestRecipe} className="mt-2">
                {isCreatingTestRecipe ? "Bezig met aanmaken..." : "Maak Test Recept"}
              </Button>

              {testRecipeId && (
                <div className="mt-4 p-3 rounded bg-green-50 text-green-700">
                  <p>Test recept aangemaakt!</p>
                  <Link href={`/recepten/${testRecipeId}`} className="text-blue-600 underline">
                    Bekijk het test recept
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>Controleer of de Supabase URL en API key correct zijn in .env.local</li>
            <li>Controleer of de tabellen 'recipes' en 'ingredients' bestaan in je Supabase database</li>
            <li>Controleer of je Row Level Security (RLS) policies correct zijn ingesteld</li>
            <li>
              Als je een foutmelding krijgt bij het aanmaken van een recept, controleer dan de console voor meer details
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
