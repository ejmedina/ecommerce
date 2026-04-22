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
      mediaBadgeTitle: "Tecnologia natural para el suelo",
      mediaBadgeDescription:
        "Zeolita volcanica de alta pureza con acidos humicos y fulvicos para gestionar nutrientes, humedad y aireacion de forma mas eficiente.",
    },
    visualDirection: {
      eyebrow: "Dirección visual",
      title: "Naturaleza inteligente",
      description:
        "La nueva narrativa baja el producto a una propuesta comercial mas clara: mejor suelo, mejor administracion de nutrientes y una planta mas fuerte desde la raiz.",
    },
    stats: [
      {
        value: "3",
        label: "Lineas iniciales",
        description: "Regular, con citronela y cannabis.",
      },
      {
        value: "4",
        label: "Beneficios clave",
        description: "Nutrientes, humedad, aireacion y raiz.",
      },
    ],
    sections: {
      product: {
        eyebrow: "Producto",
        title: "PGI como solucion institucional: una propuesta tecnica mas clara para explicar que pasa en el suelo.",
        description:
          "La web ahora ordena la propuesta alrededor de su valor tecnico: capturar nutrientes, regular humedad, mejorar aireacion y potenciar la fertilizacion sin reemplazarla.",
      },
      audiences: {
        eyebrow: "Audiencias",
        title: "Una sola tecnologia, varias puertas de entrada comerciales.",
        description:
          "PGI no se vende a una sola audiencia. La home institucional tiene que mostrar como cambia el enfoque segun el tipo de uso, sin perder consistencia tecnica.",
      },
      testimonials: {
        eyebrow: "Testimonios",
        title: "Los testimonios ayudan a traducir la promesa tecnica en escenarios concretos.",
        description:
          "La estructura ya permite ordenar mensajes por audiencia y variante. El contenido puede seguir afinandose a medida que consigamos mas casos reales y mejor respaldo para cada vertical.",
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
        title: "Preguntas frecuentes para explicar mejor como funciona PGI y donde aporta valor.",
        description:
          "Esta version ordena las dudas comerciales y tecnicas mas probables mientras seguimos consolidando material especifico por vertical.",
      },
      contact: {
        eyebrow: "Contacto",
        title: "Primero claridad tecnica, despues conversacion comercial.",
        description:
          "La intencion de esta seccion es bajar la barrera para consultas comerciales o tecnicas y abrir conversaciones mas calificadas sobre aplicaciones, variantes y canal.",
        whatsappTitle: "WhatsApp",
        emailTitle: "Email comercial",
        locationTitle: "Base operativa",
        locationDescription:
          "Pensado para acompanar uso urbano, agricola y profesional desde Argentina.",
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
