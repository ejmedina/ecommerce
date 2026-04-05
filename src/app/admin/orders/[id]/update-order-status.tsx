"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2, Check, Package, Truck, XCircle } from "lucide-react"

interface UpdateOrderStatusProps {
  orderId: string
  currentStatus: string
}

const statusOptions = [
  { value: "PENDING", label: "Pendiente", icon: Loader2 },
  { value: "PAID", label: "Pagado", icon: Check },
  { value: "PROCESSING", label: "Procesando", icon: Package },
  { value: "SHIPPED", label: "Enviado", icon: Truck },
  { value: "DELIVERED", label: "Entregado", icon: Check },
  { value: "CANCELLED", label: "Cancelado", icon: XCircle },
  { value: "REFUNDED", label: "Reembolsado", icon: XCircle },
]

export function UpdateOrderStatus({ orderId, currentStatus }: UpdateOrderStatusProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const updateStatus = async (newStatus: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentOption = statusOptions.find(opt => opt.value === currentStatus)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" isLoading={isLoading}>
          {!isLoading && <ChevronDown className="h-4 w-4 mr-2" />}
          Cambiar estado
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => updateStatus(option.value)}
            disabled={option.value === currentStatus}
            className={option.value === currentStatus ? "bg-muted" : ""}
          >
            <option.icon className="h-4 w-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
