"use client"

import { useEffect } from "react"
import { EcommerceEventPayload, trackPurchase } from "@/lib/analytics"

interface PurchaseTrackerProps {
  orderId: string
  transactionId: string
  payload: EcommerceEventPayload
}

export function PurchaseTracker({
  orderId,
  transactionId,
  payload,
}: PurchaseTrackerProps) {
  useEffect(() => {
    trackPurchase(orderId, {
      ...payload,
      transaction_id: transactionId,
    })
  }, [orderId, payload, transactionId])

  return null
}
