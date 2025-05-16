import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Functie om een volledige recepttekst te verwerken naar titel, ingrediënten en instructies
export function parseRecipeText(text: string) {
  console.log("Parsing recipe text:", text.substring(0, 100) + "...")

  // Split de tekst in regels en verwijder lege regels
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")

  if (lines.length === 0) {
    throw new Error("Geen tekst om te verwerken")
  }

  // Neem de eerste regel als titel
  const title = lines[0].trim()
  console.log("Extracted title:", title)

  // Zoek naar de secties "Ingredienten" en "Instructies"
  const ingredientsRegex = /^(ingredi[eë]nten|ingredients)[\s:]*$/i
  const instructionsRegex = /^(instructies|instructions|bereiding|bereidingswijze|preparation|method)[\s:]*$/i

  let ingredientsStartIndex = -1
  let instructionsStartIndex = -1

  // Zoek naar de secties
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()

    if (ingredientsRegex.test(line) && ingredientsStartIndex === -1) {
      ingredientsStartIndex = i + 1 // Begin na de "Ingredients" kop
      console.log("Found ingredients section at line:", i, line)
    } else if (instructionsRegex.test(line) && instructionsStartIndex === -1) {
      instructionsStartIndex = i + 1 // Begin na de "Instructions" kop
      console.log("Found instructions section at line:", i, line)
    }
  }

  // Als we geen ingrediëntensectie hebben gevonden, neem aan dat het na de titel begint
  if (ingredientsStartIndex === -1) {
    console.log("No ingredients section found, assuming it starts after title")
    ingredientsStartIndex = 1
  }

  // Als we geen instructiesectie hebben gevonden, zoek naar andere aanwijzingen
  if (instructionsStartIndex === -1) {
    console.log("No instructions section found, looking for other indicators")

    // Zoek naar patronen die op instructies kunnen wijzen
    for (let i = ingredientsStartIndex; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase()

      // Zoek naar patronen zoals "Stap 1", "1.", "Bereiden:", etc.
      if (
        /^stap\s+\d+/i.test(line) || // "Stap 1"
        /^\d+\.\s+/.test(line) || // "1. "
        /^bereiden:/i.test(line) || // "Bereiden:"
        /^zo\s+maak\s+je\s+het/i.test(line) // "Zo maak je het"
      ) {
        instructionsStartIndex = i
        console.log("Found likely instructions start at line:", i, line)
        break
      }
    }

    // Als we nog steeds geen instructiesectie hebben gevonden, neem aan dat het halverwege begint
    if (instructionsStartIndex === -1) {
      instructionsStartIndex = Math.floor((lines.length + ingredientsStartIndex) / 2)
      console.log("Still no instructions section found, assuming it starts at:", instructionsStartIndex)
    }
  }

  // Zorg ervoor dat de indices in de juiste volgorde staan
  if (instructionsStartIndex <= ingredientsStartIndex) {
    console.log("Instruction index is before or equal to ingredients index, adjusting")
    // Als de instructies voor de ingrediënten komen, is er iets mis
    // Neem aan dat de ingrediënten na de titel beginnen
    ingredientsStartIndex = 1
    // En de instructies komen na de ingrediënten
    instructionsStartIndex = Math.floor((lines.length + ingredientsStartIndex) / 2)
  }

  console.log("Final indices - ingredients:", ingredientsStartIndex, "instructions:", instructionsStartIndex)

  // Extraheer de ingrediënten
  const ingredientLines = lines.slice(ingredientsStartIndex, instructionsStartIndex)
  console.log("Ingredient lines:", ingredientLines)

  const ingredients: { name: string; quantity: string }[] = []

  // Verwerk elke ingrediëntregel
  for (const line of ingredientLines) {
    if (!line.trim() || ingredientsRegex.test(line) || instructionsRegex.test(line)) continue

    // Verbeterde regex voor het herkennen van hoeveelheden
    // We zoeken alleen naar specifieke eenheden die op zichzelf staan, niet als deel van een woord
    const match = line.match(
      /^([\d\s,./]+(?:\s+(?:g|gram|ml|l|kg|tbsp|tsp|eetlepel|theelepel|el|tl|stuk|stuks|cup|cups|oz|ounce|ounces|pound|pounds|lb|lbs))?\s+)(.+)$/i,
    )

    if (match && match[1].trim()) {
      const quantity = match[1].trim()
      const name = match[2].trim()
      ingredients.push({ quantity, name })
    } else {
      // Geen duidelijke hoeveelheid gevonden of de eenheid is deel van het ingrediënt
      ingredients.push({ quantity: "", name: line.trim() })
    }
  }

  // Extraheer de instructies
  const instructionLines = lines.slice(instructionsStartIndex)

  // Filter eventuele sectiekoppen uit de instructies
  const filteredInstructionLines = instructionLines.filter(
    (line) => !instructionsRegex.test(line) && !ingredientsRegex.test(line),
  )

  const instructions = filteredInstructionLines.join("\n")

  console.log("Extracted instructions (first 100 chars):", instructions.substring(0, 100) + "...")

  console.log("Parsing complete:", {
    title,
    ingredientsCount: ingredients.length,
    instructionsLength: instructions.length,
  })

  return {
    title,
    ingredients,
    instructions,
  }
}

// Functie om de komende 10 dagen te genereren
export function getNext10Days() {
  const days = []
  const today = new Date()

  for (let i = 0; i < 10; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const formattedDate = date.toISOString().split("T")[0]
    // Gebruik Engels datumformaat in plaats van Nederlands
    const displayDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })

    days.push({
      value: formattedDate,
      display: displayDate,
      isToday: i === 0,
    })
  }

  return days
}

// Functie om te controleren of een datum binnen de komende 10 dagen valt
export function isDateInNext10Days(dateString: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset tijd naar middernacht

  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0) // Reset tijd naar middernacht

  const tenDaysFromNow = new Date(today)
  tenDaysFromNow.setDate(today.getDate() + 10)

  return date >= today && date < tenDaysFromNow
}

// Functie om verstreken datums te verwijderen
export async function cleanupExpiredMeals() {
  // Deze functie wordt geïmplementeerd in supabase.ts
}

// Standaard labels voor boodschappen
export const DEFAULT_LABELS = [
  { id: "empty", name: " - ", color: "gray" },
  { id: "supermarkt", name: "Supermarket", color: "blue" },
  { id: "haagse-markt", name: "Farmers Market", color: "green" },
  { id: "kruidvat", name: "Drugstore", color: "pink" },
  { id: "action", name: "Discount Store", color: "orange" },
]

// Functie om ingrediënten te groeperen op label
export function groupIngredientsByLabel(ingredients: any[]) {
  const groups: Record<string, any[]> = {}

  // Initialiseer groepen met standaard labels
  DEFAULT_LABELS.forEach((label) => {
    groups[label.id] = []
  })

  // Voeg ingrediënten toe aan de juiste groep
  ingredients.forEach((ingredient) => {
    const label = ingredient.label || "empty"
    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(ingredient)
  })

  return groups
}
