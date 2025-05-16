"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Trash2, Utensils } from "lucide-react"
import {
  getRecipeWithIngredients,
  updateRecipe,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  getLabels,
  initializeLabelsTable,
} from "@/lib/supabase"
import { DEFAULT_LABELS } from "@/lib/utils"
import { ColorPicker } from "@/components/color-picker"
import { useLabelsStore } from "@/lib/labels-store"

export default function BewerkenReceptPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [ingredients, setIngredients] = useState<any[]>([])
  const [color, setColor] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gebruik de global labels store
  const { labels, updateLabels } = useLabelsStore()

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Initialiseer de labels tabel als deze nog niet bestaat
        await initializeLabelsTable()

        // Haal labels op
        const labelsData = await getLabels()

        // Als er labels zijn, gebruik deze, anders gebruik de standaard labels
        if (labelsData.length > 0) {
          updateLabels(labelsData)
        } else {
          const defaultLabelsWithPosition = DEFAULT_LABELS.map((label, index) => ({
            id: label.id,
            name: label.name,
            color: label.color,
            position: index + 1,
          }))
          updateLabels(defaultLabelsWithPosition)
        }
      } catch (err) {
        console.error("Error loading labels:", err)
      }
    }

    loadInitialData()
  }, [updateLabels])

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

        console.log("Loaded recipe:", data)
        setRecipe(data)
        setTitle(data.title)
        setInstructions(data.instructions || "")
        setColor(data.color || "")

        // Als er geen ingrediënten zijn, voeg een leeg ingredient toe
        if (!data.ingredients || data.ingredients.length === 0) {
          setIngredients([{ name: "", quantity: "", label: "", fullText: "", shopping_text: "" }])
        } else {
          // Voeg fullText toe aan elk ingredient
          setIngredients(
            data.ingredients.map((ing: any) => ({
              ...ing,
              fullText: `${ing.quantity ? ing.quantity + " " : ""}${ing.name}`,
            })),
          )
        }
      } catch (err) {
        console.error("Error loading recipe:", err)
        setError(`Fout bij het laden van het recept: ${err instanceof Error ? err.message : "Onbekende fout"}`)
      } finally {
        setLoading(false)
      }
    }

    loadRecipe()
  }, [params.id, router])

  if (params.id === "nieuw") {
    return null // Voorkom rendering tijdens redirect
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: "", label: "", fullText: "", shopping_text: "" }])
  }

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...ingredients]
    newIngredients.splice(index, 1)
    setIngredients(newIngredients)
  }

  const handleIngredientChange = (
    index: number,
    field: "name" | "quantity" | "label" | "fullText" | "shopping_text",
    value: string,
  ) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value

    // Als fullText wordt bijgewerkt, update ook name en quantity voor opslag in de database
    if (field === "fullText") {
      // Probeer de hoeveelheid en naam te scheiden voor database opslag
      const fullText = value.trim()

      // Eenvoudige parser: zoek naar het eerste woord dat geen cijfers bevat
      const words = fullText.split(" ")
      let quantityParts = []
      let nameParts = []
      let foundName = false

      for (const word of words) {
        // Als we al een naam hebben gevonden, voeg alles toe aan de naam
        if (foundName) {
          nameParts.push(word)
        }
        // Als het woord cijfers bevat, beschouw het als deel van de hoeveelheid
        else if (/\d/.test(word)) {
          quantityParts.push(word)
        }
        // Anders is dit het begin van de naam
        else {
          nameParts.push(word)
          foundName = true
        }
      }

      // Als we geen naam hebben gevonden, gebruik de hele tekst als naam
      if (nameParts.length === 0 && fullText) {
        nameParts = [fullText]
        quantityParts = []
      }

      const quantity = quantityParts.join(" ")
      const name = nameParts.join(" ")

      newIngredients[index].quantity = quantity
      newIngredients[index].name = name
    }

    if (field === "shopping_text") {
      newIngredients[index].shopping_text = value
    }

    setIngredients(newIngredients)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError("Vul een titel in voor het recept")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Update het recept
      const updatedRecipe = await updateRecipe(recipe.id, title, instructions, color)
      if (!updatedRecipe) {
        throw new Error("Fout bij het bijwerken van het recept")
      }

      // Bijhouden welke ingrediënten we hebben bijgewerkt
      const updatedIngredientIds = new Set<string>()

      // Verwijder lege ingrediënten
      const validIngredients = ingredients.filter((ing) => ing.fullText?.trim() !== "")

      // Update bestaande ingrediënten en voeg nieuwe toe
      for (let index = 0; index < validIngredients.length; index++) {
        const ingredient = validIngredients[index]
        // Zorg ervoor dat name en quantity correct zijn ingesteld
        const fullText = ingredient.fullText || ""
        let name = ingredient.name || fullText
        let quantity = ingredient.quantity || ""

        // Als fullText is ingevuld maar name of quantity niet, probeer ze te extraheren
        if (fullText && (!name || name === fullText)) {
          const words = fullText.split(" ")
          let quantityParts = []
          let nameParts = []
          let foundName = false

          for (const word of words) {
            if (foundName) {
              nameParts.push(word)
            } else if (/\d/.test(word)) {
              quantityParts.push(word)
            } else {
              nameParts.push(word)
              foundName = true
            }
          }

          if (nameParts.length === 0 && fullText) {
            nameParts = [fullText]
            quantityParts = []
          }

          quantity = quantityParts.join(" ")
          name = nameParts.join(" ")
        }

        if (ingredient.id) {
          // Update bestaand ingredient
          await updateIngredient(
            ingredient.id,
            name,
            quantity,
            ingredient.label || "empty",
            ingredient.shopping_text || "",
            ingredient.position || index,
          )
          updatedIngredientIds.add(ingredient.id)
        } else {
          // Voeg nieuw ingredient toe
          await addIngredient(
            recipe.id,
            name,
            quantity,
            ingredient.label || "empty",
            ingredient.shopping_text || "",
            index,
          )
        }
      }

      // Verwijder ingrediënten die niet meer in de lijst staan
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const originalIngredientIds = recipe.ingredients.map((ing: any) => ing.id)

        for (const id of originalIngredientIds) {
          if (!updatedIngredientIds.has(id)) {
            await deleteIngredient(id)
          }
        }
      }

      // Navigeer terug naar het recept
      router.push(`/recepten/${recipe.id}`)
    } catch (err) {
      console.error("Error updating recipe:", err)
      setError(`Fout bij het bijwerken van het recept: ${err instanceof Error ? err.message : "Onbekende fout"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-10">Loading recipe...</div>
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="py-6">
      <div className="flex items-center mb-6">
        <Link href={`/recepten/${recipe.id}`} className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Utensils className="h-6 w-6 mr-2 text-[#4285F4]" />
        <h1 className="text-2xl font-bold text-gray-800">Edit Recipe</h1>
      </div>

      {error && <div className="mb-6 p-4 border border-red-300 rounded-md bg-red-50 text-red-700">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Title</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g. Pasta Bolognese"
                required
                className="text-lg font-medium"
              />

              <div>
                <Label htmlFor="color" className="block mb-2">
                  Color
                </Label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex flex-wrap gap-2 items-start">
                    <div className="w-full sm:w-2/5">
                      <Input
                        value={ingredient.fullText || ""}
                        onChange={(e) => handleIngredientChange(index, "fullText", e.target.value)}
                        placeholder="Ingredient (e.g. 100g flour)"
                      />
                    </div>
                    <div className="w-full sm:w-1/5">
                      <select
                        value={ingredient.label || "empty"}
                        onChange={(e) => handleIngredientChange(index, "label", e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        {labels.map((label) => (
                          <option key={label.id} value={label.id}>
                            {label.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-1/4">
                      <Input
                        value={ingredient.shopping_text || ""}
                        onChange={(e) => handleIngredientChange(index, "shopping_text", e.target.value)}
                        placeholder="Text for shopping list"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex justify-center mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleAddIngredient}
                    className="rounded-full h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step by step instructions"
                rows={8}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="bg-[#4285F4] hover:bg-[#3367d6]" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
