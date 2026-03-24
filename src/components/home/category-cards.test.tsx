import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryCards } from './category-cards'

describe('CategoryCards', () => {
  it('should return null when disabled', () => {
    const cards = [
      { image: '/test.jpg', title: 'Test', subtitle: 'Test', ctaText: 'Buy', ctaLink: '/test' },
    ]
    const { container } = render(
      <CategoryCards cards={cards} enabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should return null when cards array is empty', () => {
    const { container } = render(
      <CategoryCards cards={[]} enabled={true} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render card title and subtitle', () => {
    const cards = [
      { image: '/panificados.jpg', title: 'Panificados', subtitle: 'Disfrutá del sabor casero', ctaText: 'Comprar ahora', ctaLink: '/products?category=panificados' },
    ]
    render(<CategoryCards cards={cards} enabled={true} />)
    
    expect(screen.getByText('Panificados')).toBeInTheDocument()
    expect(screen.getByText('Disfrutá del sabor casero')).toBeInTheDocument()
  })

  it('should render multiple cards', () => {
    const cards = [
      { image: '/panificados.jpg', title: 'Panificados', subtitle: 'Test', ctaText: 'Buy', ctaLink: '/panificados' },
      { image: '/dulces.jpg', title: 'Dulces', subtitle: 'Test', ctaText: 'Buy', ctaLink: '/dulces' },
    ]
    render(<CategoryCards cards={cards} enabled={true} />)
    
    expect(screen.getByText('Panificados')).toBeInTheDocument()
    expect(screen.getByText('Dulces')).toBeInTheDocument()
  })
})
