import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Prep - Meal Planning",
  description: "Plan your meals and shopping list easily",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 container mx-auto px-4 pb-20">{children}</main>
          <Navigation />
        </div>
      </body>
    </html>
  )
}
