"use client"

import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Audience, AudienceKey, Testimonial } from "@/content/institutional-home"

interface InstitutionalTestimonialsProps {
  audiences: Audience[]
  testimonials: Testimonial[]
}

const variantLabels: Record<Testimonial["variant"], string> = {
  regular: "Regular",
  citronela: "Con citronela",
  cannabis: "Cannabis",
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function InstitutionalTestimonials({
  audiences,
  testimonials,
}: InstitutionalTestimonialsProps) {
  const [currentAudience, setCurrentAudience] = useState<AudienceKey>(audiences[0]?.id ?? "hogar-jardin")

  return (
    <Tabs
      value={currentAudience}
      onValueChange={(value) => setCurrentAudience(value as AudienceKey)}
      className="space-y-8"
    >
      <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.5rem] bg-emerald-950/5 p-2">
        {audiences.map((audience) => (
          <TabsTrigger
            key={audience.id}
            value={audience.id}
            className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-950"
          >
            {audience.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {audiences.map((audience) => {
        const filteredTestimonials = testimonials.filter(
          (testimonial) => testimonial.audience === audience.id
        )

        return (
          <TabsContent key={audience.id} value={audience.id} className="space-y-6">
            <div className="max-w-3xl space-y-2">
              <h3 className="text-2xl font-semibold text-emerald-950">{audience.title}</h3>
              <p className="text-base leading-7 text-slate-600">{audience.description}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {filteredTestimonials.map((testimonial) => (
                <Card
                  key={`${testimonial.audience}-${testimonial.author}-${testimonial.role}`}
                  className="overflow-hidden rounded-[2rem] border-emerald-950/10 bg-white/90 shadow-[0_20px_70px_-45px_rgba(11,61,29,0.5)]"
                >
                  <CardContent className="space-y-5 p-6">
                    <div className="relative aspect-[16/11] overflow-hidden rounded-[1.6rem] border border-emerald-950/10 bg-emerald-50">
                      <Image
                        src={testimonial.evidence.src}
                        alt={testimonial.evidence.alt}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900 shadow-sm backdrop-blur">
                        {testimonial.evidence.label}
                      </div>
                      <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] border border-white/50 bg-white/86 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur">
                        {testimonial.evidence.caption}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                        {variantLabels[testimonial.variant]}
                      </Badge>
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                        {testimonial.role}
                      </span>
                    </div>

                    <p className="text-lg leading-8 text-slate-900">
                      “{testimonial.quote}”
                    </p>

                    <div className="flex items-center gap-4 border-t border-emerald-950/10 pt-4">
                      <Avatar className="h-14 w-14 border border-emerald-950/10 ring-4 ring-emerald-50">
                        <AvatarImage src={testimonial.avatar.src} alt={testimonial.avatar.alt} />
                        <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-900">
                          {testimonial.avatar.fallback || getInitials(testimonial.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-emerald-950">{testimonial.author}</div>
                        <div className="mt-1 text-sm text-slate-500">{testimonial.role}</div>
                        <div className="mt-1 text-sm text-slate-600">{testimonial.result}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
