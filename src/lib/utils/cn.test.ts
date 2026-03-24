import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('should merge two class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle empty strings', () => {
    const result = cn('foo', '', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should merge duplicate Tailwind classes (last wins)', () => {
    // clsx + tailwind-merge handles Tailwind class conflicts
    const result = cn('px-2 px-4')
    expect(result).toBe('px-4')
  })

  it('should handle arrays', () => {
    const result = cn(['foo', 'bar'])
    expect(result).toBe('foo bar')
  })

  it('should handle nested arrays', () => {
    const result = cn(['foo', ['bar', 'baz']])
    expect(result).toBe('foo bar baz')
  })

  it('should handle objects', () => {
    const result = cn({ foo: true, bar: false, baz: true })
    expect(result).toBe('foo baz')
  })

  it('should combine multiple types', () => {
    const result = cn(
      'px-2',
      ['py-2', 'md:py-4'],
      { 'lg:px-4': true },
      undefined,
      null
    )
    expect(result).toContain('px-2')
    expect(result).toContain('py-2')
    expect(result).toContain('md:py-4')
    expect(result).toContain('lg:px-4')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base-class', {
      'active-class': isActive,
      'disabled-class': isDisabled,
    })
    expect(result).toBe('base-class active-class')
  })

  it('should handle class priority with Tailwind conflicts', () => {
    // Later classes should override earlier ones
    const result = cn('text-red-500 text-blue-500')
    expect(result).toBe('text-blue-500')
  })
})
