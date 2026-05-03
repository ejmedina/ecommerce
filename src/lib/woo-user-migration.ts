const LOGIN_CUTOFF = new Date("2025-05-03T00:00:00-03:00")

const CUSTOMER_ROLES = new Set(["customer", "subscriber"])
const ELEVATED_ROLES = new Set([
  "administrator",
  "admin",
  "editor",
  "author",
  "contributor",
  "shop_manager",
  "shop-manager",
  "manager",
  "owner",
  "superadmin",
  "super_admin",
  "super-admin",
])

const LAST_ACTIVE_CANDIDATES = [
  "wc_last_active",
  "last_login",
  "last_login_at",
  "_last_login",
  "wp_last_login",
  "wp-last-login",
] as const

export type WooMetaDataEntry = {
  id?: number
  key?: string
  value?: unknown
}

export type WooCustomerAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  state?: string | null
  postcode?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
}

export type WooCustomer = {
  id: number
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  role?: string | null
  username?: string | null
  billing?: WooCustomerAddress | null
  shipping?: WooCustomerAddress | null
  meta_data?: WooMetaDataEntry[] | null
}

export type ParsedWooAddress = {
  label: string
  street: string
  number: string
  floor: string | null
  apartment: string | null
  city: string
  state: string
  postalCode: string
  country: string
  instructions: string | null
  source: string
  legacySourceKey: string
  dedupeKey: string
}

export type LastActiveResult = {
  lastActiveAt: Date | null
  field: string | null
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeEmail(email: unknown) {
  if (typeof email !== "string") return null
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
}

export function splitWooRoles(role: string | null | undefined) {
  return (role || "")
    .split(/[,\s|]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function isElevatedWooRole(role: string | null | undefined) {
  const roles = splitWooRoles(role)
  return roles.some((entry) => ELEVATED_ROLES.has(entry))
}

export function isCustomerWooRole(role: string | null | undefined) {
  const roles = splitWooRoles(role)
  if (roles.length === 0) return false
  if (roles.some((entry) => ELEVATED_ROLES.has(entry))) return false
  return roles.every((entry) => CUSTOMER_ROLES.has(entry))
}

function parseTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^\d{10}$/.test(trimmed)) {
      return new Date(Number.parseInt(trimmed, 10) * 1000)
    }

    if (/^\d{13}$/.test(trimmed)) {
      return new Date(Number.parseInt(trimmed, 10))
    }

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

export function extractReliableWooLastActive(metaData: WooMetaDataEntry[] | null | undefined): LastActiveResult {
  if (!metaData?.length) {
    return {
      lastActiveAt: null,
      field: null,
    }
  }

  for (const candidate of LAST_ACTIVE_CANDIDATES) {
    const match = metaData.find((entry) => entry.key === candidate)
    if (!match) continue

    const parsed = parseTimestamp(match.value)
    if (!parsed || Number.isNaN(parsed.getTime())) continue

    return {
      lastActiveAt: parsed,
      field: candidate,
    }
  }

  return {
    lastActiveAt: null,
    field: null,
  }
}

export function isWithinMigrationLoginWindow(lastActiveAt: Date | null) {
  if (!lastActiveAt) return false
  return lastActiveAt.getTime() >= LOGIN_CUTOFF.getTime()
}

export function buildDisplayName(customer: WooCustomer) {
  const parts = [
    cleanString(customer.first_name),
    cleanString(customer.last_name),
  ].filter(Boolean)

  if (parts.length > 0) {
    return parts.join(" ")
  }

  const billingParts = [
    cleanString(customer.billing?.first_name),
    cleanString(customer.billing?.last_name),
  ].filter(Boolean)

  if (billingParts.length > 0) {
    return billingParts.join(" ")
  }

  return null
}

export function extractUserPhone(customer: WooCustomer) {
  return cleanString(customer.billing?.phone) ?? cleanString(customer.shipping?.phone) ?? null
}

export function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@")
  const visibleLocal = localPart.length <= 2 ? localPart[0] ?? "*" : `${localPart.slice(0, 2)}***`
  const domainParts = domain.split(".")
  const domainName = domainParts[0] || ""
  const visibleDomain = domainName.length <= 2 ? `${domainName[0] ?? "*"}***` : `${domainName.slice(0, 2)}***`
  const suffix = domainParts.slice(1).join(".")
  return `${visibleLocal}@${visibleDomain}${suffix ? `.${suffix}` : ""}`
}

export function parseStreetAndNumber(addressLine1: string) {
  const normalized = addressLine1.trim().replace(/\s+/g, " ")
  const match = normalized.match(/^(.*?)(?:\s+|,)(\d+[A-Za-z\-\/]*)$/)

  if (match) {
    return {
      street: match[1].trim(),
      number: match[2].trim(),
    }
  }

  return {
    street: normalized,
    number: "S/N",
  }
}

export function buildAddressKey(parts: Array<string | null>) {
  return parts.map((part) => (part || "").trim().toLowerCase()).join("|")
}

export function parseWooAddress({
  address,
  label,
  source,
  customerId,
}: {
  address: WooCustomerAddress | null | undefined
  label: string
  source: "woo:billing" | "woo:shipping"
  customerId: number
}): ParsedWooAddress | null {
  const addressLine1 = cleanString(address?.address_1)
  const city = cleanString(address?.city)
  const state = cleanString(address?.state)
  const postalCode = cleanString(address?.postcode)

  if (!addressLine1 || !city || !state || !postalCode) {
    return null
  }

  const { street, number } = parseStreetAndNumber(addressLine1)
  const addressLine2 = cleanString(address?.address_2)

  return {
    label,
    street,
    number,
    floor: null,
    apartment: null,
    city,
    state,
    postalCode,
    country: cleanString(address?.country) ?? "AR",
    instructions: addressLine2,
    source,
    legacySourceKey: `${source}:${customerId}`,
    dedupeKey: buildAddressKey([
      street,
      number,
      city,
      state,
      postalCode,
      cleanString(address?.country) ?? "AR",
      addressLine2,
    ]),
  }
}

export type MigrationDecision =
  | "import"
  | "exclude_elevated_role"
  | "exclude_non_customer_role"
  | "exclude_missing_last_login"
  | "exclude_stale_last_login"
  | "exclude_invalid_email"

export type UserImportCandidate = {
  sourceId: number
  normalizedEmail: string | null
  decision: MigrationDecision
  reason: string
  name: string | null
  phone: string | null
  lastActiveAt: Date | null
  lastActiveField: string | null
  role: string | null
  addresses: ParsedWooAddress[]
}

export function pickPreferredCandidate(current: UserImportCandidate, next: UserImportCandidate) {
  if (current.decision !== "import" && next.decision === "import") {
    return mergeCandidateAddresses(next, current)
  }

  if (current.decision === "import" && next.decision !== "import") {
    return mergeCandidateAddresses(current, next)
  }

  if (
    current.decision === "import" &&
    next.decision === "import" &&
    (next.lastActiveAt?.getTime() || 0) > (current.lastActiveAt?.getTime() || 0)
  ) {
    return mergeCandidateAddresses(next, current)
  }

  return mergeCandidateAddresses(current, next)
}

export function dedupeCandidatesByEmail(candidates: UserImportCandidate[]) {
  const uniqueCandidates = new Map<string, UserImportCandidate>()
  let duplicateEmails = 0

  for (const candidate of candidates) {
    if (!candidate.normalizedEmail) {
      continue
    }

    const existing = uniqueCandidates.get(candidate.normalizedEmail)
    if (!existing) {
      uniqueCandidates.set(candidate.normalizedEmail, candidate)
      continue
    }

    duplicateEmails += 1
    uniqueCandidates.set(candidate.normalizedEmail, pickPreferredCandidate(existing, candidate))
  }

  return {
    uniqueCandidates: Array.from(uniqueCandidates.values()),
    duplicateEmails,
  }
}

function mergeCandidateAddresses(primary: UserImportCandidate, secondary: UserImportCandidate) {
  const seen = new Set<string>()
  const addresses = [...primary.addresses, ...secondary.addresses].filter((address) => {
    if (seen.has(address.dedupeKey)) return false
    seen.add(address.dedupeKey)
    return true
  })

  return {
    ...primary,
    addresses,
  }
}

export function buildUserImportCandidate(customer: WooCustomer): UserImportCandidate {
  const normalizedEmail = normalizeEmail(customer.email)
  const lastActive = extractReliableWooLastActive(customer.meta_data)
  const name = buildDisplayName(customer)
  const phone = extractUserPhone(customer)

  const addresses = [
    parseWooAddress({
      address: customer.shipping,
      label: "Envio",
      source: "woo:shipping",
      customerId: customer.id,
    }),
    parseWooAddress({
      address: customer.billing,
      label: "Facturacion",
      source: "woo:billing",
      customerId: customer.id,
    }),
  ]
    .filter((address): address is ParsedWooAddress => Boolean(address))
    .filter((address, index, all) => all.findIndex((entry) => entry.dedupeKey === address.dedupeKey) === index)
    .map((address, index, all) => ({
      ...address,
      label: all.length === 1 ? "Principal" : address.label,
    }))

  if (!normalizedEmail) {
    return {
      sourceId: customer.id,
      normalizedEmail: null,
      decision: "exclude_invalid_email",
      reason: "Email invalido o ausente",
      name,
      phone,
      lastActiveAt: lastActive.lastActiveAt,
      lastActiveField: lastActive.field,
      role: cleanString(customer.role),
      addresses,
    }
  }

  if (isElevatedWooRole(customer.role)) {
    return {
      sourceId: customer.id,
      normalizedEmail,
      decision: "exclude_elevated_role",
      reason: "Rol administrativo o con privilegios elevados",
      name,
      phone,
      lastActiveAt: lastActive.lastActiveAt,
      lastActiveField: lastActive.field,
      role: cleanString(customer.role),
      addresses,
    }
  }

  if (!isCustomerWooRole(customer.role)) {
    return {
      sourceId: customer.id,
      normalizedEmail,
      decision: "exclude_non_customer_role",
      reason: "Rol no elegible para migracion de clientes",
      name,
      phone,
      lastActiveAt: lastActive.lastActiveAt,
      lastActiveField: lastActive.field,
      role: cleanString(customer.role),
      addresses,
    }
  }

  if (!lastActive.lastActiveAt || !lastActive.field) {
    return {
      sourceId: customer.id,
      normalizedEmail,
      decision: "exclude_missing_last_login",
      reason: "Sin dato confiable de ultimo login",
      name,
      phone,
      lastActiveAt: null,
      lastActiveField: null,
      role: cleanString(customer.role),
      addresses,
    }
  }

  if (!isWithinMigrationLoginWindow(lastActive.lastActiveAt)) {
    return {
      sourceId: customer.id,
      normalizedEmail,
      decision: "exclude_stale_last_login",
      reason: "Ultimo login anterior al 2025-05-03",
      name,
      phone,
      lastActiveAt: lastActive.lastActiveAt,
      lastActiveField: lastActive.field,
      role: cleanString(customer.role),
      addresses,
    }
  }

  return {
    sourceId: customer.id,
    normalizedEmail,
    decision: "import",
    reason: "Elegible para importacion",
    name,
    phone,
    lastActiveAt: lastActive.lastActiveAt,
    lastActiveField: lastActive.field,
    role: cleanString(customer.role),
    addresses,
  }
}
