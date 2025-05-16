"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Edit, Trash2, Utensils, Share2 } from "lucide-react"
import { getRecipeWithIngredients, deleteRecipe } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

export default function ReceptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRecipe() {
      try {
        // Controleer of de ID "nieuw" is en redirect in dat geval
        if (params.id === "nieuw") {
          router.push("/recepten/nieuw")
          return
        }

        const recipeId = params.id
        if (!recipeId) {
          router.push("/recepten")
          return
        }

        const data = await getRecipeWithIngredients(recipeId)
        if (!data) {
          router.push("/recepten")
          return
        }

        setRecipe(data)
      } catch (error) {
        console.error("Error loading recipe:", error)
        router.push("/recepten")
      } finally {
        setLoading(false)
      }
    }

    loadRecipe()
  }, [params.id, router])

  const handleDeleteRecipe = async () => {
    try {
      setIsDeleting(true)
      setError(null)

      console.log("Deleting recipe with ID:", recipe.id)

      // Zorg ervoor dat we een geldige recipe.id hebben
      if (!recipe || !recipe.id) {
        setError("Geen geldig recept-ID gevonden")
        return
      }

      // Forceer een timeout om de UI te laten reageren
      await new Promise((resolve) => setTimeout(resolve, 500))

      const success = await deleteRecipe(recipe.id)
      console.log("Delete result:", success)

      if (success) {
        // Navigeer terug naar de receptenlijst
        router.push("/recepten")
      } else {
        setError("Er is een fout opgetreden bij het verwijderen van het recept")
      }
    } catch (err) {
      console.error("Error deleting recipe:", err)
      setError(`Er is een fout opgetreden: ${err instanceof Error ? err.message : "Onbekende fout"}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleShareRecipe = async () => {
    if (!recipe) return

    // Bereid de deel-informatie voor
    const shareData = {
      title: recipe.title,
      text: `Check out this recipe: ${recipe.title}`,
      url: window.location.href,
    }

    try {
      // Controleer of de Web Share API beschikbaar is
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback: kopieer de URL naar het klembord
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link gekopieerd",
          description: "De link naar dit recept is gekopieerd naar je klembord.",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Error sharing recipe:", error)
      toast({
        title: "Delen mislukt",
        description: "Er is een fout opgetreden bij het delen van dit recept.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  if (params.id === "nieuw") {
    return null // Voorkom rendering tijdens redirect
  }

  if (loading) {
    return <div className="text-center py-10">Loading recipe...</div>
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/recepten" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Utensils className="h-6 w-6 mr-2 text-[#4285F4]" />
          <h1 className="text-2xl font-bold text-gray-800">{recipe.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleShareRecipe} title="Share Recipe">
            <Share2 className="h-4 w-4" />
          </Button>

          <Link href={`/recepten/${params.id}/bewerken`}>
            <Button variant="outline" size="icon" title="Edit Recipe">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Delete Recipe"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Recipe</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the recipe "{recipe.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              {error && <div className="p-3 text-red-500 bg-red-50 rounded-md">{error}</div>}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRecipe}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-medium mb-4">Ingredients</h2>

          <Card>
            <CardContent className="p-4">
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient: any) => (
                    <li key={ingredient.id}>
                      {/* Toon hoeveelheid en naam als één tekst */}
                      {ingredient.quantity ? `${ingredient.quantity} ${ingredient.name}` : ingredient.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No ingredients added</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-medium mb-4">Instructions</h2>

          <Card>
            <CardContent className="p-4">
              <div className="whitespace-pre-line">{recipe.instructions || "No instructions added"}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
