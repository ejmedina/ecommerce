"use client"

import { useEffect, useState } from "react"

export interface ThemeColors {
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  border: string
  input: string
  ring: string
  destructive: string
  destructiveForeground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
}

const defaultColors: ThemeColors = {
  primary: "#0a0a0a",
  primaryForeground: "#ffffff",
  secondary: "#f5f5f5",
  secondaryForeground: "#0a0a0a",
  accent: "#f5f5f5",
  accentForeground: "#0a0a0a",
  background: "#ffffff",
  foreground: "#0a0a0a",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#0a0a0a",
  destructive: "#dc2626",
  destructiveForeground: "#ffffff",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  popover: "#ffffff",
  popoverForeground: "#0a0a0a",
}

function hexToRgb(hex: string | undefined | null): string {
  // Default to black if hex is invalid
  if (!hex || typeof hex !== 'string' || hex.length !== 7) {
    return "rgb(0 0 0)"
  }
  
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  return `rgb(${r} ${g} ${b})`
}

interface ThemeProviderProps {
  colors: ThemeColors | null
  children: React.ReactNode
}

export function ThemeProvider({ colors, children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const themeColors = colors || defaultColors

    // Set CSS custom properties on root element
    const root = document.documentElement
    
    root.style.setProperty("--color-primary", hexToRgb(themeColors.primary))
    root.style.setProperty("--color-primary-foreground", hexToRgb(themeColors.primaryForeground))
    root.style.setProperty("--color-secondary", hexToRgb(themeColors.secondary))
    root.style.setProperty("--color-secondary-foreground", hexToRgb(themeColors.secondaryForeground))
    root.style.setProperty("--color-accent", hexToRgb(themeColors.accent))
    root.style.setProperty("--color-accent-foreground", hexToRgb(themeColors.accentForeground))
    root.style.setProperty("--color-background", hexToRgb(themeColors.background))
    root.style.setProperty("--color-foreground", hexToRgb(themeColors.foreground))
    root.style.setProperty("--color-muted", hexToRgb(themeColors.muted))
    root.style.setProperty("--color-muted-foreground", hexToRgb(themeColors.mutedForeground))
    root.style.setProperty("--color-border", hexToRgb(themeColors.border))
    root.style.setProperty("--color-input", hexToRgb(themeColors.input))
    root.style.setProperty("--color-ring", hexToRgb(themeColors.ring))
    root.style.setProperty("--color-destructive", hexToRgb(themeColors.destructive))
    root.style.setProperty("--color-destructive-foreground", hexToRgb(themeColors.destructiveForeground))
    root.style.setProperty("--color-card", hexToRgb(themeColors.card))
    root.style.setProperty("--color-card-foreground", hexToRgb(themeColors.cardForeground))
    root.style.setProperty("--color-popover", hexToRgb(themeColors.popover))
    root.style.setProperty("--color-popover-foreground", hexToRgb(themeColors.popoverForeground))
  }, [colors, mounted])

  // Prevent flash of unstyled content
  if (!mounted) {
    return null
  }

  return <>{children}</>
}

export { defaultColors }
