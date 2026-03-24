import "next-auth"
import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    role: UserRole
  }
  interface Session {
    user: User & {
      id: string
      role: UserRole
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
  }
}

// Cart types
export interface CartItemData {
  id: string
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    images: { url: string }[]
    stock: number
  }
}

export interface CartData {
  id: string
  items: CartItemData[]
  subtotal: number
  itemCount: number
}

// Address types
export interface AddressData {
  id: string
  label: string
  street: string
  number: string
  floor?: string | null
  apartment?: string | null
  city: string
  state: string
  postalCode: string
  country: string
  instructions?: string | null
  isDefault: boolean
}

// Order types
export interface OrderAddress {
  name: string
  street: string
  number: string
  floor?: string
  apartment?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
  instructions?: string
}

export type ShippingMethod = "pickup" | "shipping"

export type PaymentMethod = "MERCADOPAGO" | "BANK_TRANSFER" | "CASH_ON_DELIVERY"
