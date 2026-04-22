import Image from "next/image"
import Link from "next/link"
import { Manrope, Sora } from "next/font/google"
import {
  ArrowRight,
  CircleCheckBig,
  Leaf,
  MessagesSquare,
  MoveRight,
  Shield,
  ShoppingBag,
  Sprout,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Audience, ProductVariant } from "@/content/institutional-home"
import { InstitutionalTestimonials } from "@/components/institutional/testimonials"
import { InstitutionalContactForm } from "@/components/institutional/contact-form"
import type { InstitutionalHomeFlavor } from "@/lib/home-flavor"

const headingFont = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const sectionEyebrow =
  "text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/90"

const audienceIcons: Record<Audience["id"], typeof Sprout> = {
  "hogar-jardin": Sprout,
  "viveros-paisajismo": Leaf,
  "agro-produccion": Shield,
  "cesped-deportivo": CircleCheckBig,
  cannabis: MessagesSquare,
}

const variantAccent: Record<ProductVariant["id"], string> = {
  regular: "from-emerald-600/15 to-lime-300/30",
  citronela: "from-lime-400/25 to-amber-200/40",
  cannabis: "from-emerald-950/10 to-emerald-400/20",
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-3xl space-y-4">
      <div className={sectionEyebrow}>{eyebrow}</div>
      <h2 className={`${headingFont.className} text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl`}>
        {title}
      </h2>
      <p className="text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
    </div>
  )
}

export function InstitutionalHome({
  flavor,
}: {
  flavor: InstitutionalHomeFlavor
}) {
  const content = flavor.content

  return (
    <main className={`${bodyFont.className} bg-[linear-gradient(180deg,#f8fff3_0%,#ffffff_32%,#f4f8f2_100%)] text-slate-950`}>
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,rgba(132,204,22,0.24),transparent_35%),radial-gradient(circle_at_top_right,rgba(22,163,74,0.18),transparent_32%),linear-gradient(180deg,rgba(11,61,29,0.02),transparent)]" />

      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-emerald-950/10 shadow-sm">
              <Image src={flavor.branding.logoSrc} alt={flavor.branding.logoAlt} fill className="object-cover" />
            </div>
            <div>
              <div className={`${headingFont.className} text-sm font-semibold text-emerald-950`}>
                {flavor.branding.name}
              </div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {flavor.branding.headerLabel}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
            <a href="#producto" className="transition-colors hover:text-emerald-900">Producto</a>
            <a href="#audiencias" className="transition-colors hover:text-emerald-900">Audiencias</a>
            <a href="#testimonios" className="transition-colors hover:text-emerald-900">Testimonios</a>
            <a href="#faq" className="transition-colors hover:text-emerald-900">FAQ</a>
            <a href="#contacto" className="transition-colors hover:text-emerald-900">Contacto</a>
          </nav>

          <Button asChild className="rounded-full px-5">
            <Link href="/products">
              Tienda
              <ShoppingBag className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-8">
            <Badge className="rounded-full bg-emerald-100 px-4 py-1.5 text-[11px] uppercase tracking-[0.24em] text-emerald-800">
              {content.eyebrow}
            </Badge>

            <div className="space-y-5">
              <h1 className={`${headingFont.className} max-w-4xl text-4xl font-semibold tracking-tight text-balance text-emerald-950 sm:text-5xl lg:text-6xl`}>
                {content.title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                {content.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {content.heroHighlights.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-950/10 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-lime-500" />
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/products">
                  Comprar en tienda
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <a href={content.whatsappUrl} target="_blank" rel="noreferrer">
                  Contacto institucional
                  <MessagesSquare className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 h-32 w-32 rounded-full bg-lime-300/20 blur-3xl" />
            <div className="absolute -right-2 bottom-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />

            <div className="relative rounded-[2rem] border border-emerald-950/10 bg-white/82 p-4 shadow-[0_30px_120px_-55px_rgba(6,46,22,0.55)] backdrop-blur">
              <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                <div className="relative min-h-[420px] overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(237,255,216,0.95),rgba(233,255,168,0.68))]">
                  <Image
                    src={flavor.hero.mediaSrc}
                    alt={flavor.hero.mediaAlt}
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  <div className="absolute inset-x-5 bottom-5 rounded-[1.4rem] border border-white/40 bg-white/78 p-4 backdrop-blur">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                      {flavor.hero.mediaBadgeTitle}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">
                      {flavor.hero.mediaBadgeDescription}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="rounded-[1.8rem] border-emerald-950/10 bg-slate-950 text-white shadow-none">
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/10">
                          <Image src={flavor.branding.logoSrc} alt={flavor.branding.logoAlt} fill className="object-cover" />
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                            {flavor.visualDirection.eyebrow}
                          </div>
                          <div className={`${headingFont.className} text-xl font-semibold text-white`}>
                            {flavor.visualDirection.title}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm leading-7 text-slate-300">
                        {flavor.visualDirection.description}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {flavor.stats.map((stat) => (
                      <Card key={stat.label} className="rounded-[1.6rem] border-emerald-950/10 bg-white/95 shadow-none">
                        <CardContent className="space-y-2 p-5">
                          <div className="text-3xl font-semibold text-emerald-950">{stat.value}</div>
                          <div className="text-sm font-medium text-slate-800">{stat.label}</div>
                          <p className="text-sm leading-6 text-slate-600">{stat.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <SectionHeading
            eyebrow={flavor.sections.product.eyebrow}
            title={flavor.sections.product.title}
            description={flavor.sections.product.description}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {content.benefits.map((benefit) => (
              <Card
                key={benefit.title}
                className="rounded-[1.8rem] border-emerald-950/10 bg-white/90 shadow-[0_18px_60px_-48px_rgba(11,61,29,0.4)]"
              >
                <CardContent className="space-y-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <h3 className={`${headingFont.className} text-xl font-semibold text-emerald-950`}>
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {content.variants.map((variant) => (
            <Card
              key={variant.id}
              className={`rounded-[2rem] border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.78)),linear-gradient(135deg,var(--tw-gradient-stops))] ${variantAccent[variant.id]} shadow-[0_24px_80px_-48px_rgba(11,61,29,0.45)]`}
            >
              <CardContent className="space-y-5 p-6">
                <Badge variant="outline" className="rounded-full border-emerald-950/10 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-900">
                  {variant.badge}
                </Badge>
                <div className="space-y-2">
                  <h3 className={`${headingFont.className} text-2xl font-semibold text-emerald-950`}>
                    {variant.name}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">{variant.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variant.useCases.map((useCase) => (
                    <span
                      key={useCase}
                      className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 rounded-[2rem] border border-emerald-950/10 bg-white/85 p-8 shadow-[0_24px_80px_-52px_rgba(11,61,29,0.45)] lg:grid-cols-2">
          {content.productNarrative.map((paragraph) => (
            <p key={paragraph} className="text-base leading-8 text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section id="audiencias" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={flavor.sections.audiences.eyebrow}
          title={flavor.sections.audiences.title}
          description={flavor.sections.audiences.description}
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {content.audiences.map((audience) => {
            const Icon = audienceIcons[audience.id]

            return (
              <Card
                key={audience.id}
                className="rounded-[2rem] border-emerald-950/10 bg-white/92 shadow-[0_24px_80px_-52px_rgba(11,61,29,0.45)]"
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {audience.label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className={`${headingFont.className} text-2xl font-semibold text-emerald-950`}>
                      {audience.title}
                    </h3>
                    <p className="text-sm leading-7 text-slate-600">{audience.description}</p>
                  </div>
                  <div className="space-y-2">
                    {audience.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2 text-sm text-slate-700">
                        <MoveRight className="mt-0.5 h-4 w-4 text-emerald-700" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section id="testimonios" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={flavor.sections.testimonials.eyebrow}
          title={flavor.sections.testimonials.title}
          description={flavor.sections.testimonials.description}
        />

        <div className="mt-10">
          <InstitutionalTestimonials
            audiences={content.audiences}
            testimonials={content.testimonials}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-emerald-950/10 bg-[linear-gradient(135deg,rgba(11,61,29,0.98),rgba(20,83,45,0.94))] px-6 py-10 text-white shadow-[0_28px_120px_-60px_rgba(6,46,22,0.65)] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <div className={sectionEyebrow}>{flavor.sections.store.eyebrow}</div>
              <h2 className={`${headingFont.className} text-3xl font-semibold tracking-tight sm:text-4xl`}>
                {flavor.sections.store.title}
              </h2>
              <p className="max-w-2xl text-base leading-8 text-emerald-50/85">
                {flavor.sections.store.description}
              </p>
            </div>

            <Button asChild size="lg" variant="secondary" className="rounded-full px-6">
              <Link href="/products">
                {flavor.sections.store.buttonLabel}
                <ShoppingBag className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={flavor.sections.faq.eyebrow}
          title={flavor.sections.faq.title}
          description={flavor.sections.faq.description}
        />

        <div className="mt-10 grid gap-4">
          {content.faq.map((item) => (
            <details
              key={item.question}
              className="group rounded-[1.8rem] border border-emerald-950/10 bg-white/92 px-6 py-5 shadow-[0_18px_60px_-52px_rgba(11,61,29,0.45)]"
            >
              <summary className="cursor-pointer list-none text-lg font-semibold text-emerald-950">
                {item.question}
              </summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6 rounded-[2rem] border border-emerald-950/10 bg-white/88 p-8 shadow-[0_24px_80px_-48px_rgba(11,61,29,0.45)]">
            <div className="space-y-4">
              <div className={sectionEyebrow}>{flavor.sections.contact.eyebrow}</div>
              <h2 className={`${headingFont.className} text-3xl font-semibold tracking-tight text-emerald-950`}>
                {flavor.sections.contact.title}
              </h2>
              <p className="text-base leading-8 text-slate-600">
                {flavor.sections.contact.description}
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.6rem] bg-emerald-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                  {flavor.sections.contact.whatsappTitle}
                </div>
                <a
                  href={content.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-lg font-semibold text-emerald-950 transition-colors hover:text-emerald-700"
                >
                  {content.whatsappLabel}
                </a>
              </div>

              <div className="rounded-[1.6rem] bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {flavor.sections.contact.emailTitle}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{content.contactEmail}</div>
              </div>

              <div className="rounded-[1.6rem] bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {flavor.sections.contact.locationTitle}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{content.location}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {flavor.sections.contact.locationDescription}
                </p>
              </div>
            </div>
          </div>

          <InstitutionalContactForm audiences={content.audiences} />
        </div>
      </section>
    </main>
  )
}
