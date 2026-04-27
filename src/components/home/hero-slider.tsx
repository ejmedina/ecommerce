"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface HeroSlide {
  image: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
}

interface HeroSliderProps {
  slides: HeroSlide[]
  enabled: boolean
}

export function HeroSlider({ slides, enabled }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!enabled || slides.length === 0) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [enabled, slides.length])

  if (!enabled || slides.length === 0) {
    return null
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }

  const currentSlide = slides[currentIndex]

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance) {
      goToNext()
    } else if (distance < -minSwipeDistance) {
      goToPrevious()
    }
  }

  return (
    <section 
      className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-gray-100"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide Image */}
      <div className="absolute inset-0">
        <Image
          src={currentSlide.image}
          alt={currentSlide.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            {currentSlide.title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-6 italic">
            {currentSlide.subtitle}
          </p>
          {currentSlide.ctaText && currentSlide.ctaLink && (
            <a
              href={currentSlide.ctaLink}
              className="inline-block bg-primary text-primary-foreground font-medium px-8 py-3 rounded-full transition-opacity hover:opacity-90"
            >
              {currentSlide.ctaText}
            </a>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/40"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
