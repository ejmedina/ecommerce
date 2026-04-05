"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  disabled?: boolean
  size?: "sm" | "default" | "lg"
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  className,
  disabled = false,
  size = "default"
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (max === undefined || value < max) {
      onChange(value + 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value)
    if (isNaN(newValue)) return

    if (newValue < min) {
      onChange(min)
    } else if (max !== undefined && newValue > max) {
      onChange(max)
    } else {
      onChange(newValue)
    }
  }

  const buttonSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-11 w-11"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"
  const inputSize = size === "sm" ? "h-8 w-10" : size === "lg" ? "h-12 w-16 text-lg" : "h-11 w-14"

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(buttonSize, "rounded-r-none border-r-0")}
        onClick={handleDecrement}
        disabled={disabled || value <= min}
      >
        <Minus className={iconSize} />
        <span className="sr-only">Disminuir cantidad</span>
      </Button>
      
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        className={cn(
          inputSize,
          "rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        min={min}
        max={max}
        disabled={disabled}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(buttonSize, "rounded-l-none border-l-0")}
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        <Plus className={iconSize} />
        <span className="sr-only">Aumentar cantidad</span>
      </Button>
    </div>
  )
}
