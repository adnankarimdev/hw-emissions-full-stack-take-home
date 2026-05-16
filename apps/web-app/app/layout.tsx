import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"

import { AppProviders } from "@/app/providers"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Emissions Monitoring Dashboard",
  description: "Industrial methane emissions ingestion and analytics dashboard.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  )
}
