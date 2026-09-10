"use client"

import { useEffect } from "react"
import { EcommerceEventPayload, trackPurchase } from "@/lib/analytics"

interface PurchaseTrackerProps {
  orderId: string
  transactionId: string
  eventId: string
  payload: EcommerceEventPayload
}

export function PurchaseTracker({
  orderId,
  transactionId,
  eventId,
  payload,
}: PurchaseTrackerProps) {
  useEffect(() => {
    trackPurchase(orderId, {
      ...payload,
      transaction_id: transactionId,
      event_id: eventId,
    })
  }, [eventId, orderId, payload, transactionId])

  return null
}
