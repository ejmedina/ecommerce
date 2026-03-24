"use client"

import * as LucideIcons from "lucide-react"

export interface InfoCard {
  icon: string
  title: string
  description: string
}

interface InfoCardsProps {
  cards: InfoCard[]
  enabled: boolean
}

// Icon component that renders any lucide icon by name
const IconComponent = ({ icon }: { icon: string }) => {
  const Icon = LucideIcons[icon as keyof typeof LucideIcons]
  
  if (!Icon) {
    // Fallback to a default icon if not found
    const DefaultIcon = LucideIcons.Star
    return <DefaultIcon className="w-12 h-12 text-primary" />
  }
  
  return <Icon className="w-12 h-12 text-primary" />
}

export function InfoCards({ cards, enabled }: InfoCardsProps) {
  if (!enabled || cards.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-8 ${
          cards.length === 2 
            ? 'grid-cols-1 md:grid-cols-2' 
            : cards.length >= 3 
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1'
        }`}>
          {cards.map((card, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center text-center p-6 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconComponent icon={card.icon} />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-gray-600 max-w-sm">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
