import { create } from "zustand"

interface Label {
  id: string
  name: string
  color: string
  position: number
}

interface LabelsState {
  labels: Label[]
  updateLabels: (labels: Label[]) => void
  getLabels: () => Label[]
}

export const useLabelsStore = create<LabelsState>((set, get) => ({
  labels: [],
  updateLabels: (labels) => set({ labels }),
  getLabels: () => get().labels,
}))
