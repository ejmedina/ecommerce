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

export const defaultThemeColors: ThemeColors = {
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

export function mergeThemeColors(
  colors: Partial<ThemeColors> | ThemeColors | null | undefined,
): ThemeColors {
  return {
    ...defaultThemeColors,
    ...(colors ?? {}),
  }
}
