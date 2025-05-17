"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowLeft, Edit, Trash2, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

interface Recipe {
  id: string
  title: string
  instructions: string
  color: string
}

interface Ingredient {
  id: string
  recipe_id: string
  name: string
  quantity: string
  label: string
  position: number
  shopping_text?: string
}

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareText, setShareText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (params.id === "new") {
      router.push("/recipes/new")
    }
  }, [params.id, router])

  useEffect(() => {
    async function fetchData() {
      // Fetch recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", params.id)
        .single()

      if (recipeError) {
        console.error("Error fetching recipe:", recipeError)
        return
      }

      setRecipe(recipeData)

      // Fetch ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("recipe_id", params.id)
        .order("position")

      if (ingredientsError) {
        console.error("Error fetching ingredients:", ingredientsError)
        return
      }

      setIngredients(ingredientsData || [])

      // Prepare share text
      if (recipeData && ingredientsData) {
        const ingredientsText = ingredientsData
          .map((ing) => `${ing.quantity ? ing.quantity + " " : ""}${ing.name}`)
          .join("\n")

        const shareContent = `${recipeData.title}

Ingredients:
${ingredientsText}

Instructions:
${recipeData.instructions}`
        setShareText(shareContent)
      }
    }

    if (params.id !== "new") {
      fetchData()
    }
  }, [supabase, params.id])

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      // 1. Get all ingredients for this recipe
      const { data: ingredientsData } = await supabase.from("ingredients").select("id").eq("recipe_id", params.id)

      const ingredientIds = ingredientsData?.map((ing) => ing.id) || []

      // 2. Delete any shopping items related to these ingredients
      if (ingredientIds.length > 0) {
        await supabase.from("shopping_items").delete().in("ingredient_id", ingredientIds)
      }

      // 3. Delete any planned meals that reference this recipe
      await supabase.from("planned_meals").delete().eq("recipe_id", params.id)

      // 4. Delete ingredients
      await supabase.from("ingredients").delete().eq("recipe_id", params.id)

      // 5. Finally delete the recipe
      await supabase.from("recipes").delete().eq("id", params.id)

      // Navigate back to recipes page
      router.push("/recipes")
    } catch (error) {
      console.error("Error deleting recipe:", error)
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    router.push(`/recipes/edit/${params.id}`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe?.title || "Recipe",
          text: shareText,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        setShowShareDialog(true)
      }
    } else {
      setShowShareDialog(true)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText)
    setShowShareDialog(false)
  }

  // Format instructions to display each line separately
  const formattedInstructions = recipe?.instructions.split("\n").filter((line) => line.trim() !== "")

  if (!recipe && params.id !== "new") {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">Loading recipe...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{recipe?.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
          <ul className="space-y-2">
            {ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                {ingredient.quantity ? `${ingredient.quantity} ` : ""}
                {ingredient.name}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <div className="prose dark:prose-invert max-w-none">
            {formattedInstructions?.map((instruction, index) => (
              <p key={index} className="my-1">
                {instruction}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this recipe? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Recipe</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="border rounded-md p-3 bg-muted/50 whitespace-pre-wrap max-h-[300px] overflow-y-auto text-sm">
              {shareText}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={copyToClipboard}>
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
