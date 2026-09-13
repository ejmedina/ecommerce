const CHECKOUT_RETURN_TO = "/checkout"

/**
 * Only checkout is a valid continuation target for the account-verification
 * journey. Keeping this allowlist narrow prevents an untrusted query string
 * from becoming an open redirect.
 */
export function getCheckoutReturnTo(value: unknown): string | null {
  return value === CHECKOUT_RETURN_TO ? CHECKOUT_RETURN_TO : null
}

export function buildCheckoutLoginUrl(value: unknown): string {
  const returnTo = getCheckoutReturnTo(value)
  return returnTo ? `/login?returnUrl=${encodeURIComponent(returnTo)}` : "/login"
}
