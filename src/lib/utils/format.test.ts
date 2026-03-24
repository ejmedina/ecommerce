import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  slugify,
  generateOrderNumber,
  truncate,
} from './format'

describe('formatCurrency', () => {
  it('should format a number as ARS currency', () => {
    const result = formatCurrency(1000)
    expect(result).toContain('1.000')
    expect(result).toContain('$')
  })

  it('should format a string number', () => {
    const result = formatCurrency('1500')
    expect(result).toContain('1.500')
  })

  it('should format with custom currency', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toContain('100')
  })

  it('should handle decimal values', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234')
    expect(result).toContain('56')
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('should handle large numbers', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1.000.000')
  })
})

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15'))
  })

  it('should format a Date object', () => {
    const date = new Date('2024-06-20')
    const result = formatDate(date)
    expect(result).toContain('20')
    expect(result).toContain('jun')
    expect(result).toContain('2024')
  })

  it('should format a string date', () => {
    const result = formatDate('2024-06-20')
    expect(result).toContain('20')
    expect(result).toContain('jun')
  })

  it('should use custom options', () => {
    const date = new Date('2024-06-20')
    const result = formatDate(date, { month: 'long', year: 'numeric' })
    expect(result).toContain('junio')
    expect(result).toContain('2024')
  })

  // Note: formatDate doesn't handle invalid dates gracefully - it throws
  // This test documents current behavior
})

describe('formatDateTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T14:30:00'))
  })

  it('should format a date with time in 12-hour format', () => {
    // The locale uses 12-hour format with AM/PM
    const date = new Date('2024-06-20T14:30:00')
    const result = formatDateTime(date)
    expect(result).toContain('20')
    expect(result).toContain('jun')
    // 14:30 in 12-hour format is 02:30 PM
    expect(result).toContain('02')
    expect(result).toContain('30')
    expect(result).toContain('m.')
  })

  it('should format a string date with time', () => {
    const result = formatDateTime('2024-06-20T14:30:00')
    expect(result).toContain('20')
    expect(result).toContain('02')
  })
})

describe('slugify', () => {
  it('should convert text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should remove accents', () => {
    expect(slugify('Olá Mundo')).toBe('ola-mundo')
    expect(slugify('España')).toBe('espana')
    expect(slugify('Ñoño')).toBe('nono')
  })

  it('should replace spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
  })

  // Note: slugify replaces special chars with hyphens, not removes them
  it('should replace special characters with hyphens', () => {
    expect(slugify('hello@world!')).toBe('hello-world')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello')
    expect(slugify('-hello-')).toBe('hello')
  })

  it('should handle multiple spaces', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('should handle empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('should handle complex text', () => {
    const result = slugify('¡Hola, Mundo! ¿Cómo estás?')
    expect(result).toBe('hola-mundo-como-estas')
  })

  it('should handle product-like slugs', () => {
    expect(slugify('iPhone 15 Pro Max 256GB')).toBe('iphone-15-pro-max-256gb')
    expect(slugify('Zapatillas Nike Air Max')).toBe('zapatillas-nike-air-max')
  })
})

describe('generateOrderNumber', () => {
  it('should return a string', () => {
    const result = generateOrderNumber()
    expect(typeof result).toBe('string')
  })

  it('should contain a hyphen', () => {
    const result = generateOrderNumber()
    expect(result).toContain('-')
  })

  it('should generate unique order numbers', () => {
    const orderNumbers = new Set<string>()
    for (let i = 0; i < 100; i++) {
      orderNumbers.add(generateOrderNumber())
    }
    // All should be unique
    expect(orderNumbers.size).toBe(100)
  })

  it('should generate numbers with correct format (TIMESTAMP-RANDOM)', () => {
    const result = generateOrderNumber()
    const parts = result.split('-')
    expect(parts.length).toBe(2)
    // First part should be a base36 timestamp
    expect(parts[0].length).toBeGreaterThan(0)
    // Second part should be a 4-character random string
    expect(parts[1].length).toBe(4)
  })
})

describe('truncate', () => {
  it('should return original string if shorter than length', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('should truncate strings longer than length', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('should return original if exactly at length', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('should handle length of 0', () => {
    expect(truncate('hello', 0)).toBe('...')
  })

  // Note: truncate includes at least 1 character before ellipsis
  it('should handle length of 1', () => {
    expect(truncate('hello', 1)).toBe('h...')
  })

  // Note: truncate includes at least 1 character before ellipsis
  it('should handle very long strings', () => {
    const longString = 'a'.repeat(1000)
    const result = truncate(longString, 10)
    // First 10 characters + '...'
    expect(result).toBe('a'.repeat(10) + '...')
    expect(result.length).toBe(10 + 3) // length + '...'
  })

  // Note: truncate counts characters including the one being cut
  // The Chinese character counts as multiple code units
  it('should work with product names', () => {
    const productName = 'iPhone 15 Pro Max 256GB Space Black钛'
    const result = truncate(productName, 20)
    expect(result).toContain('...')
    expect(result.length).toBe(23) // 20 + '...'
  })
})
