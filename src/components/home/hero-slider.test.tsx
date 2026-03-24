import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroSlider } from './hero-slider'

describe('HeroSlider', () => {
  const defaultSlides = [
    {
      image: '/slide1.jpg',
      title: 'Test Slide 1',
      subtitle: 'Subtitle 1',
      ctaText: 'Buy Now',
      ctaLink: '/products',
    },
  ]

  it('should return null when disabled', () => {
    const { container } = render(
      <HeroSlider slides={defaultSlides} enabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should return null when slides array is empty', () => {
    const { container } = render(
      <HeroSlider slides={[]} enabled={true} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render slide title', () => {
    render(<HeroSlider slides={defaultSlides} enabled={true} />)
    
    expect(screen.getByText('Test Slide 1')).toBeInTheDocument()
  })

  it('should render slide subtitle', () => {
    render(<HeroSlider slides={defaultSlides} enabled={true} />)
    
    expect(screen.getByText('Subtitle 1')).toBeInTheDocument()
  })

  it('should render CTA button', () => {
    render(<HeroSlider slides={defaultSlides} enabled={true} />)
    
    expect(screen.getByText('Buy Now')).toBeInTheDocument()
  })

  it('should render CTA link with correct href', () => {
    render(<HeroSlider slides={defaultSlides} enabled={true} />)
    
    const link = screen.getByRole('link', { name: 'Buy Now' })
    expect(link).toHaveAttribute('href', '/products')
  })
})
