"use client"

import { useEffect } from "react"
import { defaultThemeColors, mergeThemeColors, type ThemeColors } from "@/lib/theme-colors"

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
  useEffect(() => {
    const themeColors = mergeThemeColors(colors)

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
  }, [colors])

  return <>{children}</>
}

export { defaultThemeColors as defaultColors }
