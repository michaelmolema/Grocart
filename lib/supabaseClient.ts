import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Log de omgevingsvariabelen (zonder gevoelige informatie te tonen)
console.log("NEXT_PUBLIC_SUPABASE_URL beschikbaar:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY beschikbaar:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Gebruik de omgevingsvariabelen uit .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zobxdafeoyljciatfcdy.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYnhkYWZlb3lsamNpYXRmY2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0Nzg4MTUsImV4cCI6MjA2MjA1NDgxNX0.Zq8ri9lGLeCE2DxVTEJ-PFsPODjWpM01XlFBK8hu0IQ"

console.log("Supabase URL die wordt gebruikt:", supabaseUrl)

// Creëer de Supabase client
let supabaseClient: any

try {
  console.log("Supabase client aanmaken...")
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  console.log("Supabase client succesvol aangemaakt")

  // Test de verbinding
  supabaseClient.auth.getSession().then(({ data, error }: any) => {
    if (error) {
      console.error("Fout bij het testen van de Supabase verbinding:", error)
    } else {
      console.log("Supabase verbinding succesvol getest")
    }
  })
} catch (err) {
  console.error("Fout bij het aanmaken van de Supabase client:", err)
  // Maak een dummy client aan om runtime errors te voorkomen
  supabaseClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("Supabase client kon niet worden aangemaakt") }),
          order: () => Promise.resolve({ data: null, error: new Error("Supabase client kon niet worden aangemaakt") }),
        }),
        order: () => Promise.resolve({ data: null, error: new Error("Supabase client kon niet worden aangemaakt") }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: null, error: new Error("Supabase client kon niet worden aangemaakt") }),
    },
  }
}

// Exporteer de client
export const supabase = supabaseClient
