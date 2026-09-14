export function isExpectedCredentialsSigninError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: unknown }).type === "CredentialsSignin"
  )
}
