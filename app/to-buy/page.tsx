"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ShoppingBag, Plus, X, GripVertical, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorSelector } from "@/components/color-selector"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"

interface ShoppingLabel {
  id: string
  name: string
  color: string
  label_type: string
  position: number
}

interface ShoppingItem {
  id: string
  name: string
  quantity: string
  checked: boolean
  label: string
  recipe_name?: string
  position: number
  shopping_text?: string // Toegevoegd voor Shopping List Text
}

function SortableShoppingItem({
  item,
  onCheck,
  labelColor,
}: {
  item: ShoppingItem
  onCheck: (id: string) => void
  labelColor: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Gebruik shopping_text als het bestaat, anders gebruik name en quantity
  const displayText = item.shopping_text || item.name

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
        item.checked ? "opacity-60" : ""
      }`}
    >
      <button className="cursor-grab touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onCheck(item.id)}
          className="h-4 w-4 rounded-full border-gray-300"
        />
        <span className={item.checked ? "line-through text-muted-foreground" : ""}>
          {displayText}
          {item.quantity && !item.shopping_text && ` (${item.quantity})`}
        </span>
      </div>
      {item.recipe_name && <span className="text-sm text-muted-foreground ml-auto">{item.recipe_name}</span>}
    </div>
  )
}

function SortableLabel({ label }: { label: ShoppingLabel }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: label.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border-t first:border-t-0">
      <div className="flex items-center gap-2">
        <button className="cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: label.color,
            ...(label.color === "transparent" && {
              backgroundImage:
                "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
            }),
          }}
        ></div>
        <span>{label.name}</span>
      </div>
    </div>
  )
}

export default function ToBuyPage() {
  const [labels, setLabels] = useState<ShoppingLabel[]>([])
  const [items, setItems] = useState<{ [key: string]: ShoppingItem[] }>({})
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [showManageLabelsModal, setShowManageLabelsModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showEditLabelModal, setShowEditLabelModal] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#4285F4") // Google blue default
  const [editingLabel, setEditingLabel] = useState<ShoppingLabel | null>(null)

  const supabase = createClientComponentClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // Fetch all labels
    const { data: labelsData, error: labelsError } = await supabase.from("labels").select("*").order("position")

    if (labelsError) {
      console.error("Error fetching labels:", labelsError)
      return
    }

    // Filter out the empty label
    const filteredLabels = labelsData.filter((label) => label.name.trim() !== "-")
    setLabels(filteredLabels)

    // Set active label to the first non-empty label if available
    if (filteredLabels.length > 0 && !activeLabel) {
      setActiveLabel(filteredLabels[0].id)
    }

    // Fetch ingredients from planned meals
    const { data: plannedMeals, error: plannedMealsError } = await supabase.from("planned_meals").select("recipe_id")

    if (plannedMealsError) {
      console.error("Error fetching planned meals:", plannedMealsError)
      return
    }

    // Get all recipe IDs from planned meals
    const plannedRecipeIds = plannedMeals.map((meal) => meal.recipe_id)

    // Only fetch ingredients if there are planned recipes
    if (plannedRecipeIds.length === 0) {
      // No planned recipes, so no ingredients to fetch
      setItems({})
      return
    }

    // Fetch ingredients only from recipes that are planned
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select(`
        id,
        name,
        quantity,
        label,
        position,
        recipe_id,
        recipes:recipe_id (
          title
        )
      `)
      .in("recipe_id", plannedRecipeIds)
      .order("position")

    if (ingredientsError) {
      console.error("Error fetching ingredients:", ingredientsError)
      return
    }

    // Group items by label
    const grouped: { [key: string]: ShoppingItem[] } = {}

    ingredients.forEach((item) => {
      const labelId = item.label

      // Skip items with the empty label
      if (labelId && labelsData.find((l) => l.id === labelId && l.name.trim() === "-")) {
        return
      }

      if (!grouped[labelId]) {
        grouped[labelId] = []
      }

      // Use quantity field for display if it exists
      grouped[labelId].push({
        id: item.id,
        name: item.name,
        quantity: item.quantity || "",
        checked: false, // Default to unchecked
        label: labelId,
        recipe_name: item.recipes?.title,
        position: item.position || 0,
        shopping_text: item.shopping_text || "", // Use shopping_text if available
      })
    })

    // Sort items by position
    Object.keys(grouped).forEach((labelId) => {
      grouped[labelId].sort((a, b) => a.position - b.position)
    })

    setItems(grouped)

    // Also fetch items from shopping_items table
    try {
      const { data: shoppingItems, error: shoppingError } = await supabase.from("shopping_items").select("*")

      if (shoppingError) {
        console.error("Error fetching shopping items:", shoppingError)
        return
      }

      if (shoppingItems && shoppingItems.length > 0) {
        // Process shopping items and add them to the grouped items
        shoppingItems.forEach((item) => {
          const labelId = item.label

          if (!labelId) return

          if (!grouped[labelId]) {
            grouped[labelId] = []
          }

          // Check if this item is already in the list (from ingredients)
          const existingItemIndex = grouped[labelId].findIndex(
            (groupedItem) => groupedItem.id === item.id || groupedItem.name === item.name,
          )

          if (existingItemIndex === -1) {
            // Add new item
            grouped[labelId].push({
              id: item.id,
              name: item.name,
              quantity: item.quantity || "",
              checked: item.checked || false,
              label: labelId,
              position: item.position || 0,
              shopping_text: item.shopping_text || "",
            })
          }
        })
      }

      setItems(grouped)
    } catch (error) {
      console.error("Error processing shopping items:", error)
    }
  }

  const handleCheck = async (id: string) => {
    if (!activeLabel) return

    setItems((prev) => {
      const updatedItems = { ...prev }

      // Find and update the checked item
      const labelItems = [...updatedItems[activeLabel]]
      const itemIndex = labelItems.findIndex((item) => item.id === id)

      if (itemIndex !== -1) {
        // Toggle checked status
        labelItems[itemIndex] = {
          ...labelItems[itemIndex],
          checked: !labelItems[itemIndex].checked,
        }

        // Sort items: unchecked first, then checked
        const uncheckedItems = labelItems.filter((item) => !item.checked)
        const checkedItems = labelItems.filter((item) => item.checked)

        updatedItems[activeLabel] = [...uncheckedItems, ...checkedItems]
      }

      return updatedItems
    })

    // Als een item is afgevinkt, controleer of het een pantry item is en zet het aantal op 0
    const { data: pantryItems, error: pantryError } = await supabase.from("pantry_items").select("*").eq("name", id) // Hier moeten we eigenlijk op een relatie zoeken, maar voor nu gebruiken we de naam

    if (!pantryError && pantryItems && pantryItems.length > 0) {
      // Update pantry item count to 0
      await supabase.from("pantry_items").update({ count: 0 }).eq("id", pantryItems[0].id)
    }
  }

  const handleDragEnd = (event: any) => {
    if (!activeLabel) return

    const { active, over } = event

    if (active.id !== over.id) {
      setItems((prev) => {
        const oldItems = [...prev[activeLabel]]
        const oldIndex = oldItems.findIndex((item) => item.id === active.id)
        const newIndex = oldItems.findIndex((item) => item.id === over.id)

        // Only reorder within the same group (checked or unchecked)
        const activeItem = oldItems[oldIndex]
        const overItem = oldItems[newIndex]

        if (activeItem.checked !== overItem.checked) {
          return prev // Don't reorder if mixing checked and unchecked
        }

        const newItems = arrayMove(oldItems, oldIndex, newIndex)

        // Update positions in database (in a real app)
        // updateItemPositions(newItems)

        return {
          ...prev,
          [activeLabel]: newItems,
        }
      })
    }
  }

  const handleLabelDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setLabels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

        // Update positions in database (in a real app)
        // updateLabelPositions(newItems)

        return newItems
      })
    }
  }

  const handleAddItem = () => {
    if (!activeLabel || !newItemName.trim()) return

    // In a real implementation, you would add to the database
    const newItem: ShoppingItem = {
      id: `temp-${Date.now()}`,
      name: newItemName.trim(),
      quantity: "",
      checked: false,
      label: activeLabel,
      position: items[activeLabel]?.length || 0,
    }

    setItems((prev) => ({
      ...prev,
      [activeLabel]: [...(prev[activeLabel] || []), newItem],
    }))

    // Reset form
    setNewItemName("")
    setShowAddItemModal(false)
  }

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return

    // In a real implementation, you would add to the database
    const newLabel: ShoppingLabel = {
      id: `temp-${Date.now()}`,
      name: newLabelName.trim(),
      color: newLabelColor,
      label_type: "shopping",
      position: labels.length,
    }

    setLabels((prev) => [...prev, newLabel])

    // Reset form
    setNewLabelName("")
    setNewLabelColor("#4285F4")
  }

  const handleEditLabel = (label: ShoppingLabel) => {
    setEditingLabel(label)
    setNewLabelName(label.name)
    setNewLabelColor(label.color)
    setShowEditLabelModal(true)
  }

  const saveEditedLabel = () => {
    if (!editingLabel || !newLabelName.trim()) return

    setLabels((prev) =>
      prev.map((label) =>
        label.id === editingLabel.id
          ? {
              ...label,
              name: newLabelName.trim(),
              color: newLabelColor,
            }
          : label,
      ),
    )

    // In a real implementation, you would update the database
    // await supabase.from('labels').update({ name: newLabelName, color: newLabelColor }).eq('id', editingLabel.id)

    setShowEditLabelModal(false)
    setEditingLabel(null)
    setNewLabelName("")
    setNewLabelColor("#4285F4")
  }

  const handleDeleteLabel = async (id: string) => {
    setLabels((prev) => prev.filter((label) => label.id !== id))

    // If deleting active label, switch to another one
    if (activeLabel === id && labels.length > 1) {
      const newActiveLabel = labels.find((label) => label.id !== id)
      if (newActiveLabel) {
        setActiveLabel(newActiveLabel.id)
      }
    }
  }

  const getUncheckedCount = (labelId: string) => {
    return items[labelId]?.filter((item) => !item.checked).length || 0
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">To Buy</h1>
        </div>
        <Button variant="outline" onClick={() => setShowManageLabelsModal(true)}>
          Manage Labels
        </Button>
      </div>

      {labels.length > 0 && (
        <Tabs value={activeLabel || undefined} onValueChange={setActiveLabel} className="w-full">
          <TabsList className="w-full overflow-x-auto">
            {labels.map((label) => (
              <TabsTrigger key={label.id} value={label.id} className="flex items-center gap-2">
                <span>{label.name}</span>
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{getUncheckedCount(label.id)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {labels.map((label) => (
            <TabsContent key={label.id} value={label.id} className="mt-4 space-y-4">
              {/* Horizontal colored stripe */}
              <div
                className="h-1 w-full rounded-full"
                style={{
                  backgroundColor: label.color,
                  ...(label.color === "transparent" && {
                    backgroundImage:
                      "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                  }),
                }}
              ></div>

              <div className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={items[label.id]?.map((item) => item.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {items[label.id]?.map((item) => (
                      <SortableShoppingItem key={item.id} item={item} onCheck={handleCheck} labelColor={label.color} />
                    ))}
                  </SortableContext>
                </DndContext>

                {(!items[label.id] || items[label.id].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items in this list. Add some items to get started.
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10 bg-blue-500 hover:bg-blue-600"
                  onClick={() => setShowAddItemModal(true)}
                >
                  <Plus className="h-5 w-5 text-white" />
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {labels.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No labels found. Create your first label to get started.
        </div>
      )}

      {/* Add Item Modal - Simplified */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleAddItem} disabled={!newItemName.trim()}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Label Modal */}
      <Dialog open={showEditLabelModal} onOpenChange={setShowEditLabelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-label-name">Label Name</Label>
              <Input
                id="edit-label-name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Enter label name"
              />
            </div>
            <div className="space-y-2">
              <Label>Label Color</Label>
              <ColorSelector selectedColor={newLabelColor} onColorChange={setNewLabelColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLabelModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={saveEditedLabel} disabled={!newLabelName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Labels Modal - Reorganized with drag and drop */}
      <Dialog open={showManageLabelsModal} onOpenChange={setShowManageLabelsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add New Label Form - Now at the top */}
            <div className="space-y-3">
              <h3 className="font-medium">Add New Label</h3>
              <div className="space-y-2">
                <Label htmlFor="label-name">Label Name</Label>
                <Input
                  id="label-name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Enter label name"
                />
              </div>
              <div className="space-y-2">
                <Label>Label Color</Label>
                <ColorSelector selectedColor={newLabelColor} onColorChange={setNewLabelColor} />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={handleAddLabel}
                  disabled={!newLabelName.trim()}
                >
                  Add Label
                </Button>
              </div>
            </div>

            {/* Label List with drag and drop */}
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-medium">Your Labels</h3>
              <div className="border rounded-md overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleLabelDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext items={labels.map((label) => label.id)} strategy={verticalListSortingStrategy}>
                    {labels.map((label) => (
                      <div key={label.id} className="flex items-center justify-between">
                        <SortableLabel label={label} />
                        <div className="flex gap-2 pr-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditLabel(label)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteLabel(label.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
                {labels.length === 0 && (
                  <div className="p-3 text-center text-muted-foreground">
                    No labels yet. Create your first label above.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
