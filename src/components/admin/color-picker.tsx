"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  description?: string
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-10 p-1 cursor-pointer border rounded-md"
            style={{ backgroundColor: value }}
          />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 font-mono text-sm uppercase"
          placeholder="#000000"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// Preview component to show how colors look in real UI elements
interface ThemePreviewProps {
  colors: {
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
    destructive: string
    destructiveForeground: string
  }
}

export function ThemePreview({ colors }: ThemePreviewProps) {
  return (
    <div 
      className="p-4 rounded-lg border space-y-4"
      style={{ 
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.foreground
      }}
    >
      <h4 className="font-medium text-sm">Vista Previa</h4>
      
      <div className="space-y-3">
        {/* Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: colors.primary, 
              color: colors.primaryForeground 
            }}
          >
            Primario
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
            style={{ 
              backgroundColor: colors.secondary, 
              color: colors.secondaryForeground,
              borderColor: colors.border
            }}
          >
            Secundario
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
            style={{ 
              backgroundColor: colors.accent, 
              color: colors.accentForeground,
              borderColor: colors.border
            }}
          >
            Acento
          </button>
        </div>

        {/* Text colors */}
        <div className="space-y-1 pt-2 border-t" style={{ borderColor: colors.border }}>
          <p style={{ color: colors.foreground }} className="text-sm">Texto principal (#foreground)</p>
          <p style={{ color: colors.mutedForeground }} className="text-sm">Texto secundario (#mutedForeground)</p>
        </div>

        {/* Alert/Error */}
        <div 
          className="px-3 py-2 rounded-md text-sm"
          style={{ 
            backgroundColor: colors.destructive, 
            color: colors.destructiveForeground 
          }}
        >
          Alerta de error (#destructive)
        </div>

        {/* Card preview */}
        <div 
          className="p-3 rounded-md border"
          style={{ 
            backgroundColor: colors.muted,
            borderColor: colors.border
          }}
        >
          <p style={{ color: colors.mutedForeground }} className="text-xs">
            Tarjeta con fondo muted
          </p>
        </div>

        {/* Input preview */}
        <input
          type="text"
          placeholder="Input de ejemplo"
          className="w-full px-3 py-2 rounded-md border text-sm"
          style={{ 
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.foreground
          }}
          readOnly
        />
      </div>
    </div>
  )
}
