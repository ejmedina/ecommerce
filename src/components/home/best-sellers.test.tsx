import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BestSellers } from './best-sellers'

describe('BestSellers', () => {
  it('should return null when disabled', () => {
    const products = [
      { id: '1', name: 'Test', slug: 'test', price: '1000', images: [] },
    ]
    const { container } = render(
      <BestSellers products={products} enabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should return null when products array is empty', () => {
    const { container } = render(
      <BestSellers products={[]} enabled={true} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render section title', () => {
    const products = [
      { id: '1', name: 'Pan Artesano', slug: 'pan', price: '1500', images: [] },
    ]
    render(<BestSellers products={products} enabled={true} />)
    
    expect(screen.getByText('Nuestros Productos')).toBeInTheDocument()
    expect(screen.getByText('Más Vendidos')).toBeInTheDocument()
  })

  it('should render product name', () => {
    const products = [
      { id: '1', name: 'Pan Artesano', slug: 'pan', price: '1500', images: [] },
    ]
    render(<BestSellers products={products} enabled={true} />)
    
    expect(screen.getByText('Pan Artesano')).toBeInTheDocument()
  })

  it('should render product price', () => {
    const products = [
      { id: '1', name: 'Test', slug: 'test', price: '1500', images: [] },
    ]
    render(<BestSellers products={products} enabled={true} />)
    
    // Format is $ 1.500,00 (es-AR locale)
    expect(screen.getByText(/\$ 1\.500,00/)).toBeInTheDocument()
  })
})
