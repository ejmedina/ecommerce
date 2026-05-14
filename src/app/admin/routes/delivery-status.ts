export type DeliveryOutcomeValue = "DELIVERED" | "NOT_DELIVERED" | null

export function getEffectiveDeliveryOutcome(item: {
  deliveryOutcome?: string | null
  order?: {
    orderStatus?: string | null
  } | null
}): DeliveryOutcomeValue {
  if (item.deliveryOutcome === "DELIVERED" || item.deliveryOutcome === "NOT_DELIVERED") {
    return item.deliveryOutcome
  }

  if (item.order?.orderStatus === "DELIVERED" || item.order?.orderStatus === "NOT_DELIVERED") {
    return item.order.orderStatus
  }

  return null
}
