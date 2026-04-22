import type { InstitutionalHomeContent, InstitutionalLocale } from "@/content/institutional-home"
import { pgiInstitutionalHomeContent } from "@/content/institutional-home"

const HOME_FLAVORS = ["pgi"] as const

export type HomeFlavor = (typeof HOME_FLAVORS)[number]

interface InstitutionalHomeFlavorDefinition {
  id: HomeFlavor
  branding: {
    name: string
    headerLabel: string
    logoSrc: string
    logoAlt: string
  }
  hero: {
    mediaSrc: string
    mediaAlt: string
    mediaBadgeTitle: string
    mediaBadgeDescription: string
  }
  visualDirection: {
    eyebrow: string
    title: string
    description: string
  }
  stats: Array<{
    value: string
    label: string
    description: string
  }>
  sections: {
    product: {
      eyebrow: string
      title: string
      description: string
    }
    audiences: {
      eyebrow: string
      title: string
      description: string
    }
    testimonials: {
      eyebrow: string
      title: string
      description: string
    }
    store: {
      eyebrow: string
      title: string
      description: string
      buttonLabel: string
    }
    faq: {
      eyebrow: string
      title: string
      description: string
    }
    contact: {
      eyebrow: string
      title: string
      description: string
      whatsappTitle: string
      emailTitle: string
      locationTitle: string
      locationDescription: string
    }
  }
  contentByLocale: Record<InstitutionalLocale, InstitutionalHomeContent>
}

export interface InstitutionalHomeFlavor
  extends Omit<InstitutionalHomeFlavorDefinition, "contentByLocale"> {
  content: InstitutionalHomeContent
}

const institutionalHomeFlavorDefinitions: Record<HomeFlavor, InstitutionalHomeFlavorDefinition> = {
  pgi: {
    id: "pgi",
    branding: {
      name: "PGI Argentina",
      headerLabel: "Institucional + Tienda",
      logoSrc: "/pgi/pgi-perfil-ig.jpg",
      logoAlt: "PGI Argentina",
    },
    hero: {
      mediaSrc: "/pgi/flyer-pgi.png",
      mediaAlt: "Flyer de producto PGI",
      mediaBadgeTitle: "Beneficios visibles",
      mediaBadgeDescription:
        "Raíces, humedad, floración y salud vegetal ordenadas en una narrativa mucho más clara para la web.",
    },
    visualDirection: {
      eyebrow: "Dirección visual",
      title: "Naturaleza inteligente",
      description:
        "Tomamos el contenido real del Instagram, pero elevamos la presentación a una experiencia más institucional, técnica y preparada para vender.",
    },
    stats: [
      {
        value: "3",
        label: "Variantes iniciales",
        description: "Regular, con citronela y cannabis.",
      },
      {
        value: "5",
        label: "Audiencias prioritarias",
        description: "Desde hogar y jardín hasta césped deportivo.",
      },
    ],
    sections: {
      product: {
        eyebrow: "Producto",
        title: "PGI como solución institucional: menos ruido, más claridad sobre lo que aporta.",
        description:
          "La web tiene que explicar el producto mejor que el feed. Por eso reorganizamos los beneficios, los casos de uso y las variantes en una estructura que también sirva para venta consultiva.",
      },
      audiences: {
        eyebrow: "Audiencias",
        title: "Una sola home, varias puertas de entrada.",
        description:
          "PGI no se vende solo a un tipo de cliente. La home institucional tiene que ordenar esa amplitud sin perder foco comercial.",
      },
      testimonials: {
        eyebrow: "Testimonios",
        title: "El visitante puede filtrar testimonios según su interés.",
        description:
          "Esta parte ya queda armada como pidió negocio: si alguien llega por hogar, agro, césped o cannabis, ve mensajes que hablan su idioma y una variante de producto asociada.",
      },
      store: {
        eyebrow: "Tienda",
        title: "La parte institucional convence. La tienda convierte.",
        description:
          "Mantenemos la lógica que definiste: home y tienda como dos piezas complementarias dentro del mismo deploy, con continuidad visual y rutas ya existentes.",
        buttonLabel: "Ir a tienda",
      },
      faq: {
        eyebrow: "FAQ",
        title: "Preguntas frecuentes para una etapa donde todavía convivimos con contenido real y contenido en construcción.",
        description:
          "Esta versión ya ordena las preguntas que aparecen naturalmente cuando una marca está creciendo y empieza a hablarle a más de una audiencia.",
      },
      contact: {
        eyebrow: "Contacto",
        title: "Institucional primero, conversación después.",
        description:
          "La intención de esta sección es simple: bajar la barrera para consultas institucionales, comerciales o técnicas, y dejar listo el terreno para sumar WhatsApp conversacional más adelante.",
        whatsappTitle: "WhatsApp",
        emailTitle: "Email previsto",
        locationTitle: "Base operativa",
        locationDescription:
          "Pensado para acompañar uso urbano, agrícola y profesional desde Argentina.",
      },
    },
    contentByLocale: pgiInstitutionalHomeContent,
  },
}

function isHomeFlavor(value: string): value is HomeFlavor {
  return HOME_FLAVORS.includes(value as HomeFlavor)
}

export function getHomeFlavor(envValue = process.env.HOME_FLAVOR): HomeFlavor | null {
  const normalizedValue = envValue?.trim().toLowerCase()

  if (!normalizedValue) {
    return null
  }

  return isHomeFlavor(normalizedValue) ? normalizedValue : null
}

export function getInstitutionalHomeFlavor(
  envValue = process.env.HOME_FLAVOR,
  locale: InstitutionalLocale = "es"
): InstitutionalHomeFlavor | null {
  const flavor = getHomeFlavor(envValue)

  if (!flavor) {
    return null
  }

  const definition = institutionalHomeFlavorDefinitions[flavor]

  return {
    id: definition.id,
    branding: definition.branding,
    hero: definition.hero,
    visualDirection: definition.visualDirection,
    stats: definition.stats,
    sections: definition.sections,
    content: definition.contentByLocale[locale],
  }
}

