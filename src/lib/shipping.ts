// Argentine provinces
export const ARGENTINE_PROVINCES = [
  { id: "CABA", name: "Ciudad Autónoma de Buenos Aires" },
  { id: "BUENOS_AIRES", name: "Buenos Aires" },
  { id: "CATAMARCA", name: "Catamarca" },
  { id: "CHACO", name: "Chaco" },
  { id: "CHUBUT", name: "Chubut" },
  { id: "CORDOBA", name: "Córdoba" },
  { id: "CORRIENTES", name: "Corrientes" },
  { id: "ENTRE_RIOS", name: "Entre Ríos" },
  { id: "FORMOSA", name: "Formosa" },
  { id: "JUJUY", name: "Jujuy" },
  { id: "LA_PAMPA", name: "La Pampa" },
  { id: "LA_RIOJA", name: "La Rioja" },
  { id: "MENDOZA", name: "Mendoza" },
  { id: "MISIONES", name: "Misiones" },
  { id: "NEUQUEN", name: "Neuquén" },
  { id: "RIO_NEGRO", name: "Río Negro" },
  { id: "SALTA", name: "Salta" },
  { id: "SAN_JUAN", name: "San Juan" },
  { id: "SAN_LUIS", name: "San Luis" },
  { id: "SANTA_CRUZ", name: "Santa Cruz" },
  { id: "SANTA_FE", name: "Santa Fe" },
  { id: "SANTIAGO_DEL_ESTERO", name: "Santiago del Estero" },
  { id: "TIERRA_DEL_FUEGO", name: "Tierra del Fuego" },
  { id: "TUCUMAN", name: "Tucumán" },
] as const

export type ProvinceId = typeof ARGENTINE_PROVINCES[number]["id"]

// Buenos Aires zones
export const BUENOS_AIRES_ZONES = {
  CABA: "CABA",
  ZONA_NORTE: "ZONA_NORTE",
  ZONA_SUR: "ZONA_SUR",
  ZONA_OESTE: "ZONA_OESTE",
  COSTA_ATLANTICA: "COSTA_ATLANTICA",
  INTERIOR: "INTERIOR",
} as const

export type BuenosAiresZone = typeof BUENOS_AIRES_ZONES[keyof typeof BUENOS_AIRES_ZONES]

// Default zones for Buenos Aires
export const BUENOS_AIRES_ZONE_CITIES: Record<BuenosAiresZone, string[]> = {
  CABA: ["CABA", "Capital Federal"],
  ZONA_NORTE: [
    "San Isidro", "Vicente López", "Tigre", "San Fernando", "Pilar",
    "Escobar", "José C. Paz", "Malvinas Argentinas", "Zárate", "Campana",
    "San Martín", "Tres de Febrero", "Hurlingham", "Ituzaingó", "Morón"
  ],
  ZONA_SUR: [
    "Avellaneda", "Lanús", "Lomas de Zamora", "Esteban Echeverría",
    "Ezeiza", "Quilmes", "Berazategui", "Florencio Varela", "Alte. Brown",
    "President Perón", "San Vicente", "Brandsen"
  ],
  ZONA_OESTE: [
    "Merlo", "Moreno", "General Rodríguez", "La Matanza", "Ituzaingó",
    "Hurlingham", "San Martín", "Tres de Febrero", "José C. Paz",
    "Malvinas Argentinas", "Pilar", "Escobar"
  ],
  COSTA_ATLANTICA: [
    "Mar del Plata", "Pinamar", "Villa Gesell", "Necochea", "Quequén",
    "Miramar", "Madariaga", "Villa El Chocón", "Cariló", "San Bernardo",
    "Santa Teresita", "Mar de Ajó", "San Clemente del Tuyú"
  ],
  INTERIOR: [
    "Azul", "Bahía Blanca", "Baradero", "Bragado", "Campana",
    "Capitan Sarmiento", "Carlos Casares", "Carlos Tejedor", "Carmen de Areco",
    "Castelli", "Colón", "Coronel Dorrego", "Coronel Pringles", "Coronel Suárez",
    "Chivilcoy", "Daireaux", "Dolores", "General Alvear", "General Arenales",
    "General Belgrano", "General Guido", "General Lamadrid", "General Paz",
    "General Pinto", "General Viamonte", "González Chávez", "Guaminí",
    "Hipólito Yrigoyen", "Junín", "La Costa", "Laprida", "Las Flores",
    "Leandro N. Alem", "Lincoln", "Lobería", "Lobos", "Luís García",
    "Magdalena", "Maipú", "Marcos Paz", "Mercedes", "Monte", "Nazareno",
    "9 de Julio", "Olavarría", "Patagones", "Pehuajó", "Pellegrini",
    "Pergamino", "Pila", "Pinamar", "Ramallo", "Rauch", "Rivadavia",
    "Rojas", "Roque Pérez", "Saavedra", "Saladillo", "Salliqueló",
    "San Andrés de Giles", "San Antonio de Areco", "San Cayetano", "San Nicolás",
    "San Pedro", "Suipacha", "Tandil", "Tapalqué", "Trenque Lauquen",
    "Tres Arroyos", "Trenador", "Villarino", "Zona Rural Buenos Aires"
  ],
}

export interface ShippingZone {
  id: string
  name: string
  provinces: ProvinceId[]
  cities?: string[] // Optional specific cities for finer control
  cost: number
  freeFrom: number | null // null = no free shipping for this zone
  isActive: boolean
}

export interface ShippingConfig {
  zones: ShippingZone[]
}

export interface ShippingCalculation {
  zone: ShippingZone
  cost: number
  isFree: boolean
  freeFrom: number | null
  subtotal: number
}

/**
 * Get Buenos Aires zone from city name
 */
export function getBuenosAiresZone(city: string): BuenosAiresZone {
  const normalizedCity = city.toLowerCase().trim()
  
  if (BUENOS_AIRES_ZONE_CITIES.CABA.some(c => c.toLowerCase() === normalizedCity)) {
    return BUENOS_AIRES_ZONES.CABA
  }
  
  if (BUENOS_AIRES_ZONE_CITIES.ZONA_NORTE.some(c => c.toLowerCase() === normalizedCity)) {
    return BUENOS_AIRES_ZONES.ZONA_NORTE
  }
  
  if (BUENOS_AIRES_ZONE_CITIES.ZONA_SUR.some(c => c.toLowerCase() === normalizedCity)) {
    return BUENOS_AIRES_ZONES.ZONA_SUR
  }
  
  if (BUENOS_AIRES_ZONE_CITIES.ZONA_OESTE.some(c => c.toLowerCase() === normalizedCity)) {
    return BUENOS_AIRES_ZONES.ZONA_OESTE
  }
  
  if (BUENOS_AIRES_ZONE_CITIES.COSTA_ATLANTICA.some(c => c.toLowerCase() === normalizedCity)) {
    return BUENOS_AIRES_ZONES.COSTA_ATLANTICA
  }
  
  // Default to interior for Buenos Aires
  return BUENOS_AIRES_ZONES.INTERIOR
}

/**
 * Calculate shipping cost based on province and cart subtotal
 */
export function calculateShipping(
  provinceId: ProvinceId,
  city: string,
  subtotal: number,
  shippingConfig: ShippingConfig | null
): ShippingCalculation | null {
  if (!shippingConfig || !shippingConfig.zones || shippingConfig.zones.length === 0) {
    return null
  }

  // Find the matching zone
  let matchingZone: ShippingZone | null = null

  for (const zone of shippingConfig.zones) {
    if (!zone.isActive) continue

    // Check if province matches
    if (zone.provinces.includes(provinceId)) {
      // If zone has specific cities, check city match
      if (zone.cities && zone.cities.length > 0) {
        const normalizedCity = city.toLowerCase().trim()
        const cityMatch = zone.cities.some(
          c => c.toLowerCase() === normalizedCity
        )
        if (cityMatch) {
          matchingZone = zone
          break
        }
      } else {
        // No specific cities, province match is enough
        matchingZone = zone
        break
      }
    }
  }

  if (!matchingZone) {
    return null
  }

  // Calculate cost
  const isFree = matchingZone.freeFrom !== null && subtotal >= matchingZone.freeFrom
  const cost = isFree ? 0 : matchingZone.cost

  return {
    zone: matchingZone,
    cost,
    isFree,
    freeFrom: matchingZone.freeFrom,
    subtotal,
  }
}

/**
 * Get available shipping options for a province
 */
export function getShippingOptions(
  provinceId: ProvinceId,
  shippingConfig: ShippingConfig | null
): ShippingZone[] {
  if (!shippingConfig || !shippingConfig.zones) {
    return []
  }

  return shippingConfig.zones.filter(
    zone => zone.isActive && zone.provinces.includes(provinceId)
  )
}

/**
 * Get all available provinces based on configured zones
 */
export function getAvailableProvinces(shippingConfig: ShippingConfig | null): ProvinceId[] {
  if (!shippingConfig || !shippingConfig.zones) {
    return ARGENTINE_PROVINCES.map(p => p.id)
  }

  const provinceSet = new Set<ProvinceId>()
  for (const zone of shippingConfig.zones) {
    if (zone.isActive) {
      zone.provinces.forEach(p => provinceSet.add(p))
    }
  }

  return Array.from(provinceSet)
}

/**
 * Default shipping zones for Argentina
 */
export function getDefaultShippingConfig(): ShippingConfig {
  return {
    zones: [
      {
        id: "caba",
        name: "CABA",
        provinces: ["CABA"],
        cost: 0,
        freeFrom: null,
        isActive: true,
      },
      {
        id: "bsas-norte",
        name: "Buenos Aires - Zona Norte",
        provinces: ["BUENOS_AIRES"],
        cities: BUENOS_AIRES_ZONE_CITIES.ZONA_NORTE,
        cost: 5000,
        freeFrom: 25000,
        isActive: true,
      },
      {
        id: "bsas-sur",
        name: "Buenos Aires - Zona Sur",
        provinces: ["BUENOS_AIRES"],
        cities: BUENOS_AIRES_ZONE_CITIES.ZONA_SUR,
        cost: 5000,
        freeFrom: 25000,
        isActive: true,
      },
      {
        id: "bsas-oeste",
        name: "Buenos Aires - Zona Oeste",
        provinces: ["BUENOS_AIRES"],
        cities: BUENOS_AIRES_ZONE_CITIES.ZONA_OESTE,
        cost: 5000,
        freeFrom: 25000,
        isActive: true,
      },
      {
        id: "bsas-costa",
        name: "Buenos Aires - Costa Atlántica",
        provinces: ["BUENOS_AIRES"],
        cities: BUENOS_AIRES_ZONE_CITIES.COSTA_ATLANTICA,
        cost: 7000,
        freeFrom: 35000,
        isActive: true,
      },
      {
        id: "bsas-interior",
        name: "Buenos Aires - Interior",
        provinces: ["BUENOS_AIRES"],
        cost: 10000,
        freeFrom: 25000,
        isActive: true,
      },
      {
        id: "interior",
        name: "Interior del país",
        provinces: ARGENTINE_PROVINCES
          .filter(p => p.id !== "CABA" && p.id !== "BUENOS_AIRES")
          .map(p => p.id),
        cost: 10000,
        freeFrom: 25000,
        isActive: true,
      },
    ],
  }
}
