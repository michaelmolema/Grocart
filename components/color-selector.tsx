"use client"

import { cn } from "@/lib/utils"

// Wijzig de kleurenopties om zwart te vervangen door donkergrijs en wit door lichtgrijs
export const colorOptions = [
  "#4285F4", // Google Blue
  "#DB4437", // Google Red
  "#F4B400", // Google Yellow
  "#0F9D58", // Google Green
  "#673AB7", // Purple
  "#FF5722", // Deep Orange
  "#FF6EFF", // Zuurstok roze
  "#F5F5F5", // Heel lichtgrijs (was wit)
  "#333333", // Donkergrijs (was zwart)
  "transparent", // Transparant (geen kleur)
]

interface ColorSelectorProps {
  selectedColor: string
  onColorChange: (color: string) => void
  className?: string
}

export function ColorSelector({ selectedColor, onColorChange, className }: ColorSelectorProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {colorOptions.map((color) => (
        <button
          key={color}
          type="button"
          className={`h-8 w-8 rounded-full border-2 transition-all ${
            selectedColor === color ? "border-gray-900 dark:border-gray-100 scale-110" : "border-gray-300"
          }`}
          style={{
            backgroundColor: color,
            ...(color === "transparent" && {
              backgroundImage:
                "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
            }),
          }}
          onClick={() => onColorChange(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  )
}
