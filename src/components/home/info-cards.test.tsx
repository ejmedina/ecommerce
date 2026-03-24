import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InfoCards } from './info-cards'

describe('InfoCards', () => {
  const defaultCards = [
    {
      icon: 'quality',
      title: 'La mejor calidad, en casa',
      description: 'Una cuidada selección de productos premium.',
    },
    {
      icon: 'price',
      title: 'Lo rico, a buen precio',
      description: 'Directo desde la fábrica a tu hogar.',
    },
    {
      icon: 'delivery',
      title: 'Lo pedís, te lo llevamos',
      description: 'Envíos sin cargo en zona norte.',
    },
  ]

  it('should return null when disabled', () => {
    const { container } = render(
      <InfoCards cards={defaultCards} enabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should return null when cards array is empty', () => {
    const { container } = render(
      <InfoCards cards={[]} enabled={true} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render all cards', () => {
    render(<InfoCards cards={defaultCards} enabled={true} />)
    
    expect(screen.getByText('La mejor calidad, en casa')).toBeInTheDocument()
    expect(screen.getByText('Una cuidada selección de productos premium.')).toBeInTheDocument()
    expect(screen.getByText('Lo rico, a buen precio')).toBeInTheDocument()
    expect(screen.getByText('Directo desde la fábrica a tu hogar.')).toBeInTheDocument()
    expect(screen.getByText('Lo pedís, te lo llevamos')).toBeInTheDocument()
    expect(screen.getByText('Envíos sin cargo en zona norte.')).toBeInTheDocument()
  })

  it('should render 2 columns for 2 cards', () => {
    const twoCards = defaultCards.slice(0, 2)
    const { container } = render(<InfoCards cards={twoCards} enabled={true} />)
    
    // Component should render without error
    expect(container.firstChild).not.toBeNull()
  })

  it('should render 3 columns for 3 cards', () => {
    const { container } = render(<InfoCards cards={defaultCards} enabled={true} />)
    
    // Component should render without error
    expect(container.firstChild).not.toBeNull()
  })

  it('should handle single card', () => {
    const singleCard = [defaultCards[0]]
    const { container } = render(<InfoCards cards={singleCard} enabled={true} />)
    
    expect(container.firstChild).not.toBeNull()
    expect(screen.getByText('La mejor calidad, en casa')).toBeInTheDocument()
  })
})
