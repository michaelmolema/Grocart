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
import { createRecipe, addIngredient, getLabels, initializeLabelsTable } from "@/lib/supabase"
import { parseRecipeText } from "@/lib/utils"
import { DEFAULT_LABELS } from "@/lib/utils"
// Vervang de import van CookingPot door Utensils
import { ArrowLeft, Plus, Trash2, Utensils } from "lucide-react"
import { ColorPicker } from "@/components/color-picker"
import { useLabelsStore } from "@/lib/labels-store"

export default function NieuwReceptPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [ingredients, setIngredients] = useState<
    {
      name: string
      quantity: string
      label: string
      fullText: string
      shopping_text: string
      position: number
    }[]
  >([{ name: "", quantity: "", label: "", fullText: "", shopping_text: "", position: 0 }])
  const [rawText, setRawText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isParsed, setIsParsed] = useState(false)
  const [color, setColor] = useState("")
  const [loading, setLoading] = useState(true)

  // Gebruik de global labels store
  const { labels, updateLabels } = useLabelsStore()

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)

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
        setError("Er is een fout opgetreden bij het laden van de labels.")
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [updateLabels])

  const handleAddIngredient = () => {
    // Bepaal de positie voor het nieuwe ingrediënt
    const newPosition = ingredients.length > 0 ? Math.max(...ingredients.map((ing) => ing.position)) + 1 : 0
    setIngredients([
      ...ingredients,
      { name: "", quantity: "", label: "", fullText: "", shopping_text: "", position: newPosition },
    ])
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

  const handleParseText = () => {
    if (!rawText.trim()) {
      setError("Plak eerst een recept om te verwerken")
      return
    }

    try {
      const parsed = parseRecipeText(rawText)
      setTitle(parsed.title)
      setInstructions(parsed.instructions)

      // Als er geen ingrediënten zijn gevonden, voeg een leeg ingredient toe
      if (parsed.ingredients.length === 0) {
        setIngredients([{ name: "", quantity: "", label: "", fullText: "", shopping_text: "", position: 0 }])
      } else {
        setIngredients(
          parsed.ingredients.map((ing, index) => ({
            name: ing.name,
            quantity: ing.quantity,
            label: "",
            fullText: `${ing.quantity ? ing.quantity + " " : ""}${ing.name}`,
            shopping_text: "",
            position: index, // Behoud de volgorde zoals aangeleverd
          })),
        )
      }

      setIsParsed(true)
    } catch (err) {
      console.error("Error parsing text:", err)
      setError(`Fout bij het verwerken van de tekst: ${err instanceof Error ? err.message : "Onbekende fout"}`)
    }
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

      // Maak eerst het recept aan
      const recipe = await createRecipe(title, instructions, color)

      if (recipe) {
        // Verwijder lege ingrediënten
        const validIngredients = ingredients.filter((ing) => ing.fullText?.trim() !== "")

        // Voeg ingrediënten toe
        for (const ingredient of validIngredients) {
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

          if (name.trim()) {
            await addIngredient(
              recipe.id,
              name,
              quantity,
              ingredient.label || "empty",
              ingredient.shopping_text || "",
              ingredient.position,
            )
          }
        }

        // Navigeer naar de receptenpagina
        router.push("/recepten")
      } else {
        setError("Er is een fout opgetreden bij het opslaan van het recept")
      }
    } catch (err) {
      console.error("Error saving recipe:", err)
      setError(`Er is een fout opgetreden: ${err instanceof Error ? err.message : "Onbekende fout"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-10">Loading...</div>
  }

  return (
    <div className="py-6">
      {/* Vervang ook het gebruik van CookingPot door Utensils in de JSX */}
      <div className="flex items-center mb-6">
        <Link href="/recepten" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Utensils className="h-6 w-6 mr-2 text-[#4285F4]" />
        <h1 className="text-2xl font-bold text-gray-800">New Recipe</h1>
      </div>

      {error && <div className="mb-6 p-4 border border-red-300 rounded-md bg-red-50 text-red-700">{error}</div>}

      {!isParsed ? (
        <div className="space-y-6">
          <div>
            <Label htmlFor="rawText">Paste your recipe here</Label>
            <Textarea
              id="rawText"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full text of your recipe here..."
              rows={10}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleParseText}
              className="bg-[#4285F4] hover:bg-[#3367d6]"
              disabled={!rawText.trim()}
            >
              Process text
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Title</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Recipe title"
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
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Step by step instructions"
                  rows={8}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setIsParsed(false)}>
                Back to paste
              </Button>
              <Button type="submit" className="bg-[#4285F4] hover:bg-[#3367d6]" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Recipe"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
