"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format, addDays, startOfDay, isSameDay } from "date-fns"
import { CalendarDays, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"

interface Recipe {
  id: string
  title: string
  color: string
}

interface PlannedMeal {
  id: string
  recipe_id: string
  date: string
  meal_type: string
  recipe: Recipe
}

export default function PlannerPage() {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const supabase = createClientComponentClient()

  // Generate dates for the next 10 days (today + 9 following days)
  const today = startOfDay(new Date())
  const dates = Array.from({ length: 10 }, (_, i) => addDays(today, i))

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // Fetch planned meals
    const { data: mealsData, error: mealsError } = await supabase
      .from("planned_meals")
      .select(`
        id,
        recipe_id,
        date,
        meal_type,
        recipe:recipes (
          id,
          title,
          color
        )
      `)
      .order("date")

    if (mealsError) {
      console.error("Error fetching planned meals:", mealsError)
      return
    }

    setPlannedMeals(mealsData || [])

    // Fetch recipes for adding new meals
    const { data: recipesData, error: recipesError } = await supabase
      .from("recipes")
      .select("id, title, color")
      .order("position")

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return
    }

    setRecipes(recipesData || [])
  }

  const getMealsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return plannedMeals.filter((meal) => meal.date.startsWith(dateStr))
  }

  const handleAddMeal = (date: Date) => {
    setSelectedDate(date)
    setShowRecipeModal(true)
  }

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!selectedDate) return

    // Create a new planned meal
    const newMeal = {
      recipe_id: recipe.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      meal_type: "dinner", // Default meal type
    }

    const { data, error } = await supabase.from("planned_meals").insert([newMeal]).select()

    if (error) {
      console.error("Error adding planned meal:", error)
      return
    }

    // Add the new meal to the state with the recipe data
    if (data && data.length > 0) {
      setPlannedMeals([
        ...plannedMeals,
        {
          ...data[0],
          recipe,
        },
      ])
    }

    setShowRecipeModal(false)
  }

  const handleRemoveMeal = async (mealId: string) => {
    // Find the meal to be removed
    const mealToRemove = plannedMeals.find((meal) => meal.id === mealId)
    if (!mealToRemove) return

    // Remove from state
    setPlannedMeals((prev) => prev.filter((meal) => meal.id !== mealId))

    // Delete from the database
    const { error } = await supabase.from("planned_meals").delete().eq("id", mealId)

    if (error) {
      console.error("Error removing planned meal:", error)
      return
    }

    // In deze applicatie worden ingrediënten direct in de ingredients tabel opgeslagen
    // en niet in een aparte shopping_items tabel. We hoeven dus geen ingrediënten te verwijderen.
    // Als er in de toekomst een shopping_items tabel wordt toegevoegd, kan deze code worden aangepast.

    // Optioneel: Als je wilt controleren of er nog andere geplande maaltijden zijn die hetzelfde recept gebruiken
    // voordat je ingrediënten verwijdert, kun je dat hier doen.

    // const otherMealsWithSameRecipe = plannedMeals.filter(
    //   meal => meal.id !== mealId && meal.recipe_id === mealToRemove.recipe_id
    // );

    // if (otherMealsWithSameRecipe.length === 0) {
    //   // Dit is de laatste geplande maaltijd met dit recept, dus we kunnen veilig de ingrediënten verwijderen
    //   // Code om ingrediënten te verwijderen zou hier komen
    // }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Planner</h1>
        </div>
        <Button variant="outline" onClick={() => setShowManageModal(true)}>
          Manage Planner
        </Button>
      </div>

      {viewMode === "list" && (
        <div className="space-y-2">
          {dates.map((date) => {
            const meals = getMealsForDate(date)

            return (
              <div key={date.toISOString()} className="flex items-center justify-between py-2 px-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(date, "EEEE, MMM d")}</span>
                </div>

                <div className="flex items-center gap-2">
                  {meals.map((meal) => (
                    <Badge
                      key={meal.id}
                      variant="outline"
                      className="flex items-center gap-1 px-2 py-1"
                      style={{
                        borderColor: meal.recipe.color,
                        color: meal.recipe.color,
                      }}
                    >
                      {meal.recipe.title}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 p-0"
                        onClick={() => handleRemoveMeal(meal.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}

                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full h-7 w-7 bg-blue-500 border-blue-500 hover:bg-blue-600 hover:border-blue-600"
                    onClick={() => handleAddMeal(date)}
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === "calendar" && (
        <div className="grid grid-cols-7 gap-2">
          {/* Calendar header */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-medium p-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {generateCalendarDays().map((day, index) => {
            const isToday = day ? isSameDay(day, new Date()) : false
            const meals = day ? getMealsForDate(day) : []

            return (
              <div
                key={index}
                className={`border rounded-md p-2 min-h-[100px] ${
                  !day ? "bg-gray-50 dark:bg-gray-900/20" : ""
                } ${isToday ? "border-blue-500" : ""}`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm ${isToday ? "font-bold text-blue-500" : ""}`}>{format(day, "d")}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddMeal(day)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {meals.map((meal) => (
                        <div
                          key={meal.id}
                          className="text-xs p-1 rounded flex justify-between items-center"
                          style={{ backgroundColor: `${meal.recipe.color}20`, color: meal.recipe.color }}
                        >
                          <span className="truncate">{meal.recipe.title}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={() => handleRemoveMeal(meal.id)}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Recipe Selection Modal */}
      <Dialog open={showRecipeModal} onOpenChange={setShowRecipeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a recipe</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                className="w-full p-3 rounded-md border text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{ borderColor: recipe.color, color: recipe.color }}
                onClick={() => handleSelectRecipe(recipe)}
              >
                {recipe.title}
              </button>
            ))}
            {recipes.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No recipes available. Add some recipes first.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Planner Modal */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Planner</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="py-4">
            <div>
              <h3 className="font-medium mb-2">View</h3>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  className={viewMode === "list" ? "bg-blue-500 hover:bg-blue-600" : ""}
                  onClick={() => setViewMode("list")}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  className={viewMode === "calendar" ? "bg-blue-500 hover:bg-blue-600" : ""}
                  onClick={() => setViewMode("calendar")}
                >
                  Calendar
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setShowManageModal(false)}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to generate calendar days
function generateCalendarDays() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  // Get the day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
  const startDay = startOfMonth.getDay()

  // Calculate total days to display (including padding)
  const totalDays = startDay + endOfMonth.getDate()
  // Round up to nearest multiple of 7 to complete the last week
  const totalCells = Math.ceil(totalDays / 7) * 7

  // Generate array of days
  const days: (Date | null)[] = []

  // Add empty cells for days before the start of the month
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }

  // Add days of the month
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    days.push(new Date(today.getFullYear(), today.getMonth(), i))
  }

  // Add empty cells to complete the grid
  for (let i = days.length; i < totalCells; i++) {
    days.push(null)
  }

  return days
}
