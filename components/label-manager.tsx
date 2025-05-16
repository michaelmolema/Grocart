"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, X, AlertCircle } from "lucide-react"
import { getLabels, addLabel, updateLabel, deleteLabel, initializeLabelsTable } from "@/lib/supabase"
import { DEFAULT_LABELS } from "@/lib/utils"
import { useLabelsStore } from "@/lib/labels-store"

interface LabelItem {
  id: string
  name: string
  color: string
  position: number
}

interface LabelManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function LabelManager({ isOpen, onClose }: LabelManagerProps) {
  const [labels, setLabels] = useState<LabelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddMode, setIsAddMode] = useState(false)
  const [editingLabel, setEditingLabel] = useState<LabelItem | null>(null)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("gray")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Gebruik de global labels store
  const { updateLabels } = useLabelsStore()

  // Beschikbare kleuren voor labels
  const AVAILABLE_COLORS = [
    { id: "gray", name: "Gray" },
    { id: "blue", name: "Blue" },
    { id: "green", name: "Green" },
    { id: "red", name: "Red" },
    { id: "purple", name: "Purple" },
    { id: "yellow", name: "Yellow" },
    { id: "orange", name: "Orange" },
    { id: "pink", name: "Pink" },
  ]

  useEffect(() => {
    if (isOpen) {
      loadLabels()
    }
  }, [isOpen])

  const loadLabels = async () => {
    try {
      setLoading(true)
      setError(null)

      // Initialiseer de labels tabel als deze nog niet bestaat
      await initializeLabelsTable()

      // Haal de labels op
      const labelsData = await getLabels()

      // Als er geen labels zijn, gebruik de standaard labels
      if (labelsData.length === 0) {
        const defaultLabelsWithPosition = DEFAULT_LABELS.map((label, index) => ({
          id: label.id,
          name: label.name,
          color: label.color,
          position: index + 1,
        }))
        setLabels(defaultLabelsWithPosition)

        // Update de global store
        updateLabels(defaultLabelsWithPosition)
      } else {
        setLabels(labelsData)

        // Update de global store
        updateLabels(labelsData)
      }
    } catch (err) {
      console.error("Error loading labels:", err)
      setError("Failed to load labels. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) {
      setError("Please enter a label name")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const newLabel = await addLabel(newLabelName, newLabelColor)
      if (newLabel) {
        const updatedLabels = [...labels, newLabel]
        setLabels(updatedLabels)

        // Update de global store
        updateLabels(updatedLabels)

        setNewLabelName("")
        setNewLabelColor("gray")
        setIsAddMode(false)
      }
    } catch (err) {
      console.error("Error adding label:", err)
      setError("Failed to add label. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLabel = async () => {
    if (!editingLabel) return

    if (!editingLabel.name.trim()) {
      setError("Please enter a label name")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const updatedLabel = await updateLabel(editingLabel.id, {
        name: editingLabel.name,
        color: editingLabel.color,
      })

      if (updatedLabel) {
        const updatedLabels = labels.map((label) => (label.id === updatedLabel.id ? updatedLabel : label))
        setLabels(updatedLabels)

        // Update de global store
        updateLabels(updatedLabels)

        setEditingLabel(null)
      }
    } catch (err) {
      console.error("Error updating label:", err)
      setError("Failed to update label. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLabel = async (id: string) => {
    try {
      setIsSubmitting(true)
      setDeleteError(null)

      await deleteLabel(id)
      const updatedLabels = labels.filter((label) => label.id !== id)
      setLabels(updatedLabels)

      // Update de global store
      updateLabels(updatedLabels)

      setDeleteConfirmId(null)
    } catch (err) {
      console.error("Error deleting label:", err)
      setDeleteError(err instanceof Error ? err.message : "Failed to delete label. It may be in use.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (label: LabelItem) => {
    setEditingLabel(label)
    setIsAddMode(false)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleColorChange = (color: string) => {
    if (editingLabel) {
      setEditingLabel({ ...editingLabel, color })
    } else {
      setNewLabelColor(color)
    }
  }

  const renderColorPicker = (selectedColor: string, onChange: (color: string) => void) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {AVAILABLE_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`w-8 h-8 rounded-full border-2 ${
            selectedColor === color.id ? "ring-2 ring-offset-2 ring-[#4285F4]" : ""
          } bg-${color.id}-500`}
          onClick={() => onChange(color.id)}
          title={color.name}
        />
      ))}
    </div>
  )

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">Loading labels...</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {labels.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No labels found. Add your first label.</div>
          ) : (
            <ul className="space-y-2">
              {labels.map((label) => (
                <li
                  key={label.id}
                  className={`p-3 border rounded-md ${
                    editingLabel?.id === label.id ? "border-[#4285F4] bg-blue-50" : ""
                  }`}
                >
                  {editingLabel?.id === label.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`edit-label-${label.id}`} className="text-sm font-medium">
                          Label Name
                        </Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingLabel(null)}
                          className="h-7 w-7 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        id={`edit-label-${label.id}`}
                        value={editingLabel.name}
                        onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                        className="mb-2"
                      />
                      <div>
                        <Label className="text-sm font-medium">Color</Label>
                        {renderColorPicker(editingLabel.color, handleColorChange)}
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleUpdateLabel} disabled={isSubmitting} size="sm">
                          {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full bg-${label.color}-500 mr-3`} />
                        <span>{label.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(label)}
                          className="h-7 w-7 rounded-full"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {label.id !== "empty" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(label.id)}
                            className="h-7 w-7 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAddMode ? (
            <div className="mt-4 p-3 border rounded-md border-[#4285F4] bg-blue-50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-label-name" className="text-sm font-medium">
                    New Label Name
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAddMode(false)}
                    className="h-7 w-7 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  id="new-label-name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Enter label name"
                  className="mb-2"
                />
                <div>
                  <Label className="text-sm font-medium">Color</Label>
                  {renderColorPicker(newLabelColor, handleColorChange)}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddLabel} disabled={isSubmitting} size="sm">
                    {isSubmitting ? "Adding..." : "Add Label"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddMode(true)}
              className="mt-4 w-full bg-[#4285F4] hover:bg-[#3367d6]"
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Label
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        </DialogFooter>

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Label</DialogTitle>
              </DialogHeader>

              <p>Are you sure you want to delete this label? This action cannot be undone.</p>

              {deleteError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start mt-2">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteLabel(deleteConfirmId)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
