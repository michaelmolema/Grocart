"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getNext10Days } from "@/lib/utils"
import { getPlannedMeals, getRecipes, addPlannedMeal, removePlannedMeal, cleanupExpiredMeals } from "@/lib/supabase"
import { Calendar, Plus, X } from "lucide-react"
import { RECIPE_COLORS } from "@/components/recipe-list"

export default function PlannerPage() {
  const [days, setDays] = useState<any[]>([])
  const [plannedMeals, setPlannedMeals] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // Verwijder eerst verstreken geplande maaltijden
        await cleanupExpiredMeals()

        // Laad de komende 10 dagen
        const next10Days = getNext10Days()
        setDays(next10Days)

        // Laad geplande maaltijden
        const meals = await getPlannedMeals()
        setPlannedMeals(meals)

        // Laad recepten
        const recipeData = await getRecipes()
        setRecipes(recipeData)
      } catch (error) {
        console.error("Error loading planner data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const getMealsForDay = (date: string) => {
    return plannedMeals.filter((meal) => meal.date === date)
  }

  const handleAddMeal = (day: string) => {
    setSelectedDay(day)
    setIsDialogOpen(true)
  }

  const handleSelectRecipe = async (recipeId: string) => {
    if (!selectedDay) return

    try {
      const newMeal = await addPlannedMeal(recipeId, selectedDay)
      if (newMeal) {
        // Voeg het recept toe aan de nieuwe maaltijd voor weergave
        const recipe = recipes.find((r) => r.id === recipeId)
        setPlannedMeals([...plannedMeals, { ...newMeal, recipes: recipe }])
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error adding meal:", error)
    }
  }

  const handleRemoveMeal = async (mealId: string) => {
    try {
      const success = await removePlannedMeal(mealId)
      if (success) {
        setPlannedMeals(plannedMeals.filter((meal) => meal.id !== mealId))
      }
    } catch (error) {
      console.error("Error removing meal:", error)
    }
  }

  // Functie om de juiste border class te krijgen op basis van de kleur
  const getBorderClass = (color: string) => {
    const colorObj = RECIPE_COLORS.find((c) => c.id === color)
    return colorObj ? colorObj.value : ""
  }

  // Functie om de juiste text class te krijgen op basis van de kleur
  const getTextClass = (color: string) => {
    const colorObj = RECIPE_COLORS.find((c) => c.id === color)
    if (!colorObj || !colorObj.value) return ""

    // Converteer border class naar text class
    // bijv. "border-blue-500" -> "text-blue-500"
    return colorObj.value.replace("border-", "text-")
  }

  if (loading) {
    return <div className="text-center py-10">Loading planner...</div>
  }

  return (
    <div className="py-6">
      <div className="flex items-center mb-6">
        <Calendar className="h-6 w-6 mr-2 text-[#4285F4]" />
        <h1 className="text-2xl font-bold text-gray-800">Planner</h1>
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const meals = getMealsForDay(day.value)

          return (
            <Card key={day.value} className={`${day.isToday ? "border-[#4285F4]" : ""} shadow-sm`}>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <h2 className={`font-medium ${day.isToday ? "text-[#4285F4]" : ""}`}>{day.display}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {meals.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {meals.map((meal) => {
                          const recipeColor = meal.recipes?.color || ""
                          const borderClass = getBorderClass(recipeColor)
                          const textClass = getTextClass(recipeColor)

                          return (
                            <div
                              key={meal.id}
                              className={`flex items-center bg-white rounded-full px-3 py-1 text-sm border ${borderClass || "border-gray-200"}`}
                            >
                              <span className={`${textClass || "text-gray-800"} font-medium`}>
                                {meal.recipes?.title}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMeal(meal.id)}
                                className="h-5 w-5 ml-1 text-gray-500 hover:text-red-500 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="icon"
                      onClick={() => handleAddMeal(day.value)}
                      className="h-8 w-8 rounded-full bg-[#4285F4] text-white hover:bg-[#3367d6]"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a recipe</DialogTitle>
          </DialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {recipes.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No recipes found. Add recipes first.</p>
            ) : (
              <div className="space-y-2">
                {recipes.map((recipe) => {
                  const borderClass = getBorderClass(recipe.color)
                  const textClass = getTextClass(recipe.color)

                  return (
                    <div
                      key={recipe.id}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${borderClass || ""}`}
                      onClick={() => handleSelectRecipe(recipe.id)}
                    >
                      <span className={`${textClass || ""} font-medium`}>{recipe.title}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
