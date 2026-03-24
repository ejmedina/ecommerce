import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateShipping,
  getBuenosAiresZone,
  getShippingOptions,
  getAvailableProvinces,
  getDefaultShippingConfig,
  ARGENTINE_PROVINCES,
  BUENOS_AIRES_ZONES,
} from './shipping'

describe('getBuenosAiresZone', () => {
  it('should return CABA for CABA city', () => {
    expect(getBuenosAiresZone('CABA')).toBe(BUENOS_AIRES_ZONES.CABA)
    expect(getBuenosAiresZone('Capital Federal')).toBe(BUENOS_AIRES_ZONES.CABA)
  })

  it('should return ZONA_NORTE for northern cities', () => {
    expect(getBuenosAiresZone('San Isidro')).toBe(BUENOS_AIRES_ZONES.ZONA_NORTE)
    expect(getBuenosAiresZone('Tigre')).toBe(BUENOS_AIRES_ZONES.ZONA_NORTE)
    expect(getBuenosAiresZone('Pilar')).toBe(BUENOS_AIRES_ZONES.ZONA_NORTE)
  })

  it('should return ZONA_SUR for southern cities', () => {
    expect(getBuenosAiresZone('Avellaneda')).toBe(BUENOS_AIRES_ZONES.ZONA_SUR)
    expect(getBuenosAiresZone('Quilmes')).toBe(BUENOS_AIRES_ZONES.ZONA_SUR)
  })

  it('should return ZONA_OESTE for western cities', () => {
    expect(getBuenosAiresZone('La Matanza')).toBe(BUENOS_AIRES_ZONES.ZONA_OESTE)
    expect(getBuenosAiresZone('Merlo')).toBe(BUENOS_AIRES_ZONES.ZONA_OESTE)
  })

  it('should return COSTA_ATLANTICA for coastal cities', () => {
    expect(getBuenosAiresZone('Mar del Plata')).toBe(BUENOS_AIRES_ZONES.COSTA_ATLANTICA)
    expect(getBuenosAiresZone('Pinamar')).toBe(BUENOS_AIRES_ZONES.COSTA_ATLANTICA)
  })

  it('should return INTERIOR for unknown Buenos Aires cities', () => {
    expect(getBuenosAiresZone('Unknown City')).toBe(BUENOS_AIRES_ZONES.INTERIOR)
  })

  it('should handle case insensitive matching', () => {
    expect(getBuenosAiresZone('tigre')).toBe(BUENOS_AIRES_ZONES.ZONA_NORTE)
    expect(getBuenosAiresZone('QUILMES')).toBe(BUENOS_AIRES_ZONES.ZONA_SUR)
  })

  it('should handle whitespace in city names', () => {
    expect(getBuenosAiresZone('  Tigre  ')).toBe(BUENOS_AIRES_ZONES.ZONA_NORTE)
  })
})

describe('calculateShipping', () => {
  const defaultConfig = getDefaultShippingConfig()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  it('should return null when shippingConfig is null', () => {
    const result = calculateShipping('CABA', 'CABA', 10000, null)
    expect(result).toBeNull()
  })

  it('should return null when shippingConfig has no zones', () => {
    const result = calculateShipping('CABA', 'CABA', 10000, { zones: [] })
    expect(result).toBeNull()
  })

  it('should return null when province has no configured zone', () => {
    const result = calculateShipping('TUCUMAN', 'San Miguel de Tucumán', 10000, {
      zones: [{
        id: 'caba',
        name: 'CABA',
        provinces: ['CABA'],
        cost: 0,
        freeFrom: null,
        isActive: true,
      }],
    })
    expect(result).toBeNull()
  })

  it('should calculate CABA shipping as free (no cost)', () => {
    const result = calculateShipping('CABA', 'CABA', 10000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.cost).toBe(0)
    // CABA has freeFrom: null, so isFree is false (no free shipping threshold)
    expect(result!.isFree).toBe(false)
    expect(result!.zone.name).toBe('CABA')
  })

  it('should calculate ZONA_NORTE shipping with cost under free threshold', () => {
    const result = calculateShipping('BUENOS_AIRES', 'San Isidro', 10000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.cost).toBe(5000)
    expect(result!.isFree).toBe(false)
    expect(result!.zone.name).toBe('Buenos Aires - Zona Norte')
  })

  it('should calculate free shipping when subtotal exceeds freeFrom', () => {
    const result = calculateShipping('BUENOS_AIRES', 'San Isidro', 30000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.cost).toBe(0)
    expect(result!.isFree).toBe(true)
  })

  it('should use city matching for Buenos Aires zones', () => {
    // Mar del Plata should be in Costa Atlántica
    const result = calculateShipping('BUENOS_AIRES', 'Mar del Plata', 10000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.zone.name).toBe('Buenos Aires - Costa Atlántica')
    expect(result!.cost).toBe(7000)
  })

  it('should return interior Buenos Aires for unknown cities', () => {
    const result = calculateShipping('BUENOS_AIRES', 'Unknown BSAS City', 10000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.zone.name).toBe('Buenos Aires - Interior')
    expect(result!.cost).toBe(10000)
  })

  it('should calculate interior shipping correctly', () => {
    const result = calculateShipping('CORDOBA', 'Córdoba', 10000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.cost).toBe(10000)
    expect(result!.isFree).toBe(false)
  })

  it('should calculate free interior shipping when threshold is met', () => {
    const result = calculateShipping('CORDOBA', 'Córdoba', 30000, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.cost).toBe(0)
    expect(result!.isFree).toBe(true)
  })

  it('should skip inactive zones', () => {
    const configWithInactiveZone = {
      zones: [{
        id: 'caba-inactive',
        name: 'CABA (Inactive)',
        provinces: ['CABA'],
        cost: 1000,
        freeFrom: null,
        isActive: false, // This should be skipped
      }],
    }
    const result = calculateShipping('CABA', 'CABA', 10000, configWithInactiveZone)
    expect(result).toBeNull()
  })

  it('should correctly include subtotal in response', () => {
    const subtotal = 15000
    const result = calculateShipping('CABA', 'CABA', subtotal, defaultConfig)
    expect(result).not.toBeNull()
    expect(result!.subtotal).toBe(subtotal)
  })
})

describe('getShippingOptions', () => {
  it('should return empty array when config is null', () => {
    const result = getShippingOptions('CABA', null)
    expect(result).toEqual([])
  })

  it('should return empty array when config has no zones', () => {
    const result = getShippingOptions('CABA', { zones: [] })
    expect(result).toEqual([])
  })

  it('should return only active zones for province', () => {
    const config = getDefaultShippingConfig()
    const result = getShippingOptions('CABA', config)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('caba')
  })

  it('should return multiple zones for Buenos Aires', () => {
    const config = getDefaultShippingConfig()
    const result = getShippingOptions('BUENOS_AIRES', config)
    // CABA zones + Buenos Aires zones (excludes interior del país)
    expect(result.length).toBeGreaterThan(1)
  })
})

describe('getAvailableProvinces', () => {
  it('should return all provinces when config is null', () => {
    const result = getAvailableProvinces(null)
    expect(result).toEqual(ARGENTINE_PROVINCES.map(p => p.id))
  })

  // Note: empty zones array returns empty result (documents actual behavior)

  it('should return only provinces in active zones', () => {
    const config = {
      zones: [{
        id: 'caba',
        name: 'CABA',
        provinces: ['CABA'],
        isActive: true,
        cost: 0,
        freeFrom: null,
      }],
    }
    const result = getAvailableProvinces(config)
    expect(result).toEqual(['CABA'])
  })
})

describe('getDefaultShippingConfig', () => {
  it('should return a valid shipping config', () => {
    const config = getDefaultShippingConfig()
    expect(config.zones).toBeDefined()
    expect(config.zones.length).toBeGreaterThan(0)
  })

  it('should have CABA zone with 0 cost', () => {
    const config = getDefaultShippingConfig()
    const cabaZone = config.zones.find(z => z.id === 'caba')
    expect(cabaZone).toBeDefined()
    expect(cabaZone!.cost).toBe(0)
    expect(cabaZone!.freeFrom).toBeNull()
  })

  it('should have interior zone covering all non-CABA/BSAS provinces', () => {
    const config = getDefaultShippingConfig()
    const interiorZone = config.zones.find(z => z.id === 'interior')
    expect(interiorZone).toBeDefined()
    expect(interiorZone!.provinces).not.toContain('CABA')
    expect(interiorZone!.provinces).not.toContain('BUENOS_AIRES')
    expect(interiorZone!.provinces).toContain('CORDOBA')
    expect(interiorZone!.provinces).toContain('MENDOZA')
  })

  it('should have Buenos Aires zones with city-specific matching', () => {
    const config = getDefaultShippingConfig()
    const norteZone = config.zones.find(z => z.id === 'bsas-norte')
    expect(norteZone).toBeDefined()
    expect(norteZone!.cities).toBeDefined()
    expect(norteZone!.cities!.length).toBeGreaterThan(0)
    expect(norteZone!.cities).toContain('San Isidro')
  })
})
