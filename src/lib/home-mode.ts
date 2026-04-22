export type HomeMode = "storefront" | "institutional"

const DEFAULT_HOME_MODE: HomeMode = "storefront"

export function getHomeMode(envValue = process.env.HOME_MODE): HomeMode {
  const normalizedValue = envValue?.trim().toLowerCase()

  if (normalizedValue === "institutional") {
    return "institutional"
  }

  return DEFAULT_HOME_MODE
}

export function isInstitutionalHomeEnabled(envValue = process.env.HOME_MODE): boolean {
  return getHomeMode(envValue) === "institutional"
}
