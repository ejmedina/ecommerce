"use client"

import Image from "next/image"
import Link from "next/link"

export interface CategoryCard {
  categoryId?: string
  image: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
}

interface CategoryCardsProps {
  cards: CategoryCard[]
  enabled: boolean
}

export function CategoryCards({ cards, enabled }: CategoryCardsProps) {
  if (!enabled || cards.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-6 ${
          cards.length === 2 
            ? 'grid-cols-1 md:grid-cols-2' 
            : cards.length === 3 
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {cards.map((card, index) => (
            <Link
              key={index}
              href={card.ctaLink}
              className="group relative overflow-hidden rounded-lg block"
            >
              <div className="relative h-48 md:h-64">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                <h3 className="text-xl md:text-2xl font-bold mb-1">
                  {card.title}
                </h3>
                <p className="text-sm md:text-base text-white/90 mb-3">
                  {card.subtitle}
                </p>
                {card.ctaText && (
                  <span className="inline-block bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-full transition-opacity hover:opacity-90 w-fit">
                    {card.ctaText}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
