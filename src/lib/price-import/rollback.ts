export function canRevertLoggedPrice(currentPrice: number, loggedNewPrice: number) {
  return normalizePrice(currentPrice) === normalizePrice(loggedNewPrice)
}

function normalizePrice(value: number) {
  return Math.round(value * 100)
}
