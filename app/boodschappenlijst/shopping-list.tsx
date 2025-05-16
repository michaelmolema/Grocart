"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getShoppingListWithPantryItems,
  updateShoppingListItem,
  cleanupOldCheckedItems,
  getLabels,
  initializeLabelsTable,
  addPantryItem,
  addPantryItemToShoppingList,
  updateShoppingItemPosition,
} from "@/lib/supabase"
import { groupIngredientsByLabel, DEFAULT_LABELS } from "@/lib/utils"
import { useLabelsStore } from "@/lib/labels-store"
import { LabelManager } from "@/components/label-manager"
import { CheckCircle, Circle, ShoppingCart, Plus, GripVertical, AlertCircle, Trash2 } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"

// Hulpfunctie om de eerste letter van een string naar een hoofdletter om te zetten
const capitalizeFirstLetter = (string: string) => {
  if (!string) return string
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// Sorteerbaar item component
function SortableItem({
  item,
  onToggleCheck,
}: {
  item: any
  onToggleCheck: (item: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded ${
        transform ? "bg-gray-50 shadow-md" : ""
      }`}
    >
      <div className="flex items-center">
        <div className="mr-2 cursor-grab touch-manipulation" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={() => onToggleCheck(item)}
          className={`mr-2 ${item.checked ? "text-green-500" : "text-gray-400 hover:text-green-500"}`}
        >
          {item.checked ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>
        <span className={item.checked ? "line-through text-gray-500" : ""}>{capitalizeFirstLetter(item.name)}</span>
        {item.quantity && <span className="ml-2 text-sm text-gray-500">({item.quantity})</span>}
      </div>
      {item.recipes && item.recipes.length > 0 && (
        <div className="text-xs text-gray-500">
          {item.recipes.map((recipe: any, index: number) => (
            <span key={recipe.id}>
              {recipe.title}
              {index < item.recipes.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}

export default function ShoppingList() {
  const [items, setItems] = useState<any[]>([])
  const [groupedItems, setGroupedItems] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemLabel, setNewItemLabel] = useState("empty")
  const [newItemQuantity, setNewItemQuantity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOldCheckedWarning, setShowOldCheckedWarning] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Gebruik de global labels store
  const { labels, updateLabels } = useLabelsStore()

  // Sensors voor drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimale afstand voordat drag begint
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)

        // Initialiseer de labels tabel als deze nog niet bestaat
        await initializeLabelsTable(DEFAULT_LABELS)

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

        // Controleer op oude afgevinkte items
        const hasOldCheckedItems = await checkForOldCheckedItems()
        setShowOldCheckedWarning(hasOldCheckedItems)

        // Laad de boodschappenlijst
        await loadShoppingList()
      } catch (err) {
        console.error("Error loading initial data:", err)
        setError("An error occurred while loading the data.")
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [updateLabels])

  const loadShoppingList = async () => {
    try {
      setLoading(true)
      const shoppingItems = await getShoppingListWithPantryItems()
      setItems(shoppingItems)

      // Groepeer items op label
      const grouped = groupIngredientsByLabel(shoppingItems)

      // Sorteer items in elke groep zodat afgevinkte items onderaan komen
      Object.keys(grouped).forEach((labelId) => {
        if (grouped[labelId] && grouped[labelId].length > 0) {
          grouped[labelId].sort((a, b) => {
            // Als beide items afgevinkt of beide niet afgevinkt zijn, behoud de huidige volgorde
            if (a.checked === b.checked) return 0
            // Als a is afgevinkt en b niet, plaats a onderaan
            if (a.checked) return 1
            // Als b is afgevinkt en a niet, plaats b onderaan
            return -1
          })
        }
      })

      setGroupedItems(grouped)

      // Stel de eerste tab in als er nog geen actieve tab is
      if (activeTab === "all" && labels.length > 0) {
        // Vind de eerste label met items
        for (const label of labels) {
          if (grouped[label.id] && grouped[label.id].length > 0) {
            setActiveTab(label.id)
            break
          }
        }
      }
    } catch (err) {
      console.error("Error loading shopping list:", err)
      setError("An error occurred while loading the shopping list.")
    } finally {
      setLoading(false)
    }
  }

  const checkForOldCheckedItems = async () => {
    try {
      // Controleer of er afgevinkte items zijn die ouder zijn dan 24 uur
      const items = await getShoppingListWithPantryItems()
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const oldCheckedItems = items.filter((item) => {
        if (!item.checked || !item.checked_at) return false
        const checkedAt = new Date(item.checked_at)
        return checkedAt < oneDayAgo
      })

      return oldCheckedItems.length > 0
    } catch (err) {
      console.error("Error checking for old checked items:", err)
      return false
    }
  }

  const handleCleanupOldCheckedItems = async () => {
    try {
      await cleanupOldCheckedItems()
      setShowOldCheckedWarning(false)
      await loadShoppingList()
    } catch (err) {
      console.error("Error cleaning up old checked items:", err)
      setError("An error occurred while cleaning up old checked items.")
    }
  }

  const handleToggleCheck = async (item: any) => {
    try {
      // Maak een kopie van het item met de nieuwe checked status
      const updatedItem = {
        ...item,
        checked: !item.checked,
        checked_at: !item.checked ? new Date().toISOString() : null,
      }

      // Stuur alleen de velden die we willen updaten
      const updates = {
        checked: updatedItem.checked,
        checked_at: updatedItem.checked_at,
      }

      // Update het item in de database
      await updateShoppingListItem(item.id, updates)

      // Update de lokale state
      const newItems = items.map((i) => (i.id === item.id ? updatedItem : i))
      setItems(newItems)

      // Hergroepeer de items
      const grouped = groupIngredientsByLabel(newItems)

      // Sorteer items in elke groep zodat afgevinkte items onderaan komen
      Object.keys(grouped).forEach((labelId) => {
        if (grouped[labelId] && grouped[labelId].length > 0) {
          grouped[labelId].sort((a, b) => {
            // Als beide items afgevinkt of beide niet afgevinkt zijn, behoud de huidige volgorde
            if (a.checked === b.checked) return 0
            // Als a is afgevinkt en b niet, plaats a onderaan
            if (a.checked) return 1
            // Als b is afgevinkt en a niet, plaats b onderaan
            return -1
          })
        }
      })

      setGroupedItems(grouped)
    } catch (err) {
      console.error("Error toggling item check:", err)
      setError("An error occurred while checking the item.")
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      setError("Please enter a name for the item")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Voeg het item toe aan de pantry
      const pantryItem = await addPantryItem(newItemName, "default", newItemLabel, newItemQuantity)

      if (pantryItem) {
        // Voeg het item toe aan de boodschappenlijst
        await addPantryItemToShoppingList(pantryItem.id)

        // Reset het formulier en sluit de dialog
        setNewItemName("")
        setNewItemLabel("empty")
        setNewItemQuantity("")
        setIsAddItemDialogOpen(false)

        // Herlaad de boodschappenlijst
        await loadShoppingList()
      }
    } catch (err) {
      console.error("Error adding item:", err)
      setError("An error occurred while adding the item.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragEnd = async (event: any, labelId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    try {
      // Maak een kopie van de items voor deze label
      const labelItems = [...(groupedItems[labelId] || [])]

      // Vind de indices van de gesleepte en doelitems
      const oldIndex = labelItems.findIndex((item) => item.id === active.id)
      const newIndex = labelItems.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Verplaats het item in de array
      const [movedItem] = labelItems.splice(oldIndex, 1)
      labelItems.splice(newIndex, 0, movedItem)

      // Update de positie van alle items
      const updatedItems = labelItems.map((item, index) => ({
        ...item,
        position: index,
      }))

      // Update de state onmiddellijk om de UI bij te werken
      const newGroupedItems = {
        ...groupedItems,
        [labelId]: updatedItems,
      }
      setGroupedItems(newGroupedItems)

      // Maak een nieuwe platte lijst van alle items
      const newItems = Object.values(newGroupedItems).flat()
      setItems(newItems)

      // Update de database voor alle items in de nieuwe volgorde
      for (let i = 0; i < updatedItems.length; i++) {
        await updateShoppingItemPosition(updatedItems[i].id, i)
      }

      // Sorteer items zodat afgevinkte items onderaan komen
      updatedItems.sort((a, b) => {
        // Als beide items afgevinkt of beide niet afgevinkt zijn, behoud de huidige volgorde
        if (a.checked === b.checked) return 0
        // Als a is afgevinkt en b niet, plaats a onderaan
        if (a.checked) return 1
        // Als b is afgevinkt en a niet, plaats b onderaan
        return -1
      })
    } catch (error) {
      console.error("Error updating item positions:", error)
      // Bij een fout, herlaad de data om de oorspronkelijke volgorde te herstellen
      await loadShoppingList()
    }
  }

  const getLabelName = (labelId: string) => {
    const label = labels.find((l) => l.id === labelId)
    return label ? label.name : labelId
  }

  const getLabelColor = (labelId: string) => {
    const label = labels.find((l) => l.id === labelId)
    return label ? label.color : "gray"
  }

  if (loading) {
    return <div className="text-center py-10">Boodschappenlijst laden...</div>
  }

  // Sorteer de labels op positie
  const sortedLabels = [...labels].sort((a, b) => a.position - b.position)

  // Filter labels die items hebben
  const labelsWithItems = sortedLabels.filter((label) => groupedItems[label.id] && groupedItems[label.id].length > 0)

  // Controleer of er items zijn
  const hasItems = items.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-[#4285F4]" />
          <h1 className="text-2xl font-bold text-gray-800">To Buy</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLabelManagerOpen(true)}>
            Manage Labels
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-300 rounded-md bg-red-50 text-red-700 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showOldCheckedWarning && (
        <div className="mb-6 p-4 border border-amber-300 rounded-md bg-amber-50 text-amber-700 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>There are checked items older than 24 hours. Do you want to clean them up?</span>
          </div>
          <Button variant="outline" onClick={handleCleanupOldCheckedItems} className="ml-4">
            <Trash2 className="mr-2 h-4 w-4" />
            Clean Up
          </Button>
        </div>
      )}

      {!hasItems ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Your shopping list is empty.</p>
            <p className="text-sm mt-2">Plan meals in the planner or manually add items to your shopping list.</p>
            <Button onClick={() => setIsAddItemDialogOpen(true)} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full flex flex-wrap justify-start gap-2 bg-gray-100 border border-gray-200 rounded-md p-2">
            {labelsWithItems.map((label) => (
              <TabsTrigger
                key={label.id}
                value={label.id}
                className={`flex-shrink-0 ${
                  activeTab === label.id ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <span>{label.name}</span>
                  {groupedItems[label.id] && (
                    <span className="ml-2 text-xs bg-gray-200 rounded-full px-2 py-0.5">
                      {groupedItems[label.id].filter((item) => !item.checked).length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {labelsWithItems.map((label) => (
            <TabsContent key={label.id} value={label.id} className="mt-0">
              <Card>
                <CardContent className={`pt-6 border-t-4 border-${label.color}-500`}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center">{label.name}</h2>
                    <Button
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#4285F4] hover:bg-[#3367d6] text-white"
                      onClick={() => {
                        setNewItemLabel(label.id)
                        setIsAddItemDialogOpen(true)
                      }}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, label.id)}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext
                      items={(groupedItems[label.id] || []).map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="divide-y">
                        {(groupedItems[label.id] || []).map((item) => (
                          <SortableItem key={item.id} item={item} onToggleCheck={handleToggleCheck} />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Label Manager Dialog */}
      <LabelManager isOpen={isLabelManagerOpen} onClose={() => setIsLabelManagerOpen(false)} />

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <label htmlFor="name" className="text-sm font-medium w-16 flex-shrink-0 text-black">
                Item
              </label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Milk, Bread, Rice"
                required
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="label" className="text-sm font-medium w-16 flex-shrink-0 text-black">
                Label
              </label>
              <select
                id="label"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                required
              >
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
