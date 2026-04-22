export type InstitutionalLocale = "es"

export type AudienceKey =
  | "hogar-jardin"
  | "viveros-paisajismo"
  | "agro-produccion"
  | "cesped-deportivo"
  | "cannabis"

export type VariantKey = "regular" | "citronela" | "cannabis"

export interface Audience {
  id: AudienceKey
  label: string
  title: string
  description: string
  highlights: string[]
}

export interface ProductVariant {
  id: VariantKey
  name: string
  badge: string
  description: string
  useCases: string[]
}

export interface Benefit {
  title: string
  description: string
}

export interface TestimonialAvatar {
  src?: string
  alt: string
  fallback: string
}

export interface TestimonialEvidence {
  src: string
  alt: string
  label: string
  caption: string
}

export interface Testimonial {
  audience: AudienceKey
  variant: VariantKey
  author: string
  role: string
  quote: string
  result: string
  avatar: TestimonialAvatar
  evidence: TestimonialEvidence
}

export interface FaqItem {
  question: string
  answer: string
}

export interface InstitutionalHomeContent {
  locale: InstitutionalLocale
  eyebrow: string
  title: string
  description: string
  whatsappUrl: string
  whatsappLabel: string
  contactEmail: string
  contactPhone: string
  location: string
  heroHighlights: string[]
  productNarrative: string[]
  benefits: Benefit[]
  variants: ProductVariant[]
  audiences: Audience[]
  testimonials: Testimonial[]
  faq: FaqItem[]
}

export const pgiInstitutionalHomeContent: Record<InstitutionalLocale, InstitutionalHomeContent> = {
  es: {
    locale: "es",
    eyebrow: "PGI Argentina | Potenciador Germinativo Inteligente",
    title: "Una home institucional para explicar mejor por qué PGI aporta valor desde la raíz.",
    description:
      "PGI combina una narrativa cercana con una promesa técnica simple: ayudar a que plantas, cultivos y céspedes se desarrollen con más fuerza, mejor retención de humedad y un suelo más activo.",
    whatsappUrl:
      "https://wa.me/5491128865141?text=Hola%20PGI%2C%20quiero%20hacer%20una%20consulta%20sobre%20el%20producto.",
    whatsappLabel: "+54 9 11 2886-5141",
    contactEmail: "comercial@pgi.com.ar",
    contactPhone: "+54 9 11 2886-5141",
    location: "Buenos Aires, Argentina",
    heroHighlights: [
      "100% orgánico",
      "Uso agrícola y urbano",
      "Pet & kid friendly",
      "Compatible con múltiples audiencias",
    ],
    productNarrative: [
      "La comunicación actual de PGI repite una idea clara: el producto acompaña el crecimiento desde el suelo, favoreciendo germinación, raíces, floración y retención de humedad.",
      "Para esta primera versión institucional tomamos esa base real del contenido publicado y la ordenamos para que le sirva tanto a consumidores finales como a viveros, paisajistas, productores y canchas deportivas.",
    ],
    benefits: [
      {
        title: "Mejor arranque y germinación",
        description:
          "Ayuda a que el inicio del cultivo tenga mejores condiciones de humedad, aireación y actividad en el suelo.",
      },
      {
        title: "Raíces más activas",
        description:
          "Refuerza el desarrollo radicular, uno de los beneficios más repetidos en la comunicación actual de la marca.",
      },
      {
        title: "Retención de humedad",
        description:
          "Aporta estabilidad en el entorno de crecimiento y acompaña mejor periodos de estrés hídrico o climático.",
      },
      {
        title: "Aplicaciones diversas",
        description:
          "Puede presentarse como una solución útil para jardín urbano, producción, paisajismo y mantenimiento de césped.",
      },
    ],
    variants: [
      {
        id: "regular",
        name: "PGI Regular",
        badge: "Versión base",
        description:
          "La línea principal para comunicar los beneficios generales del producto en jardinería, viveros, paisajismo y producción.",
        useCases: [
          "Hogar y jardín",
          "Huerta urbana",
          "Viveros",
          "Producción general",
        ],
      },
      {
        id: "citronela",
        name: "PGI con citronela",
        badge: "Línea especial",
        description:
          "Versión pensada para contextos donde interesa sumar una experiencia más específica de uso y diferenciación comercial.",
        useCases: [
          "Espacios exteriores",
          "Patios y balcones",
          "Paisajismo residencial",
          "Presentación diferencial",
        ],
      },
      {
        id: "cannabis",
        name: "PGI Cannabis",
        badge: "Línea segmentada",
        description:
          "Versión orientada a un público que necesita una comunicación dedicada, lenguaje propio y casos de uso específicos.",
        useCases: [
          "Cultivo específico",
          "Growshops",
          "Productores especializados",
          "Comunidad cannábica",
        ],
      },
    ],
    audiences: [
      {
        id: "hogar-jardin",
        label: "Hogar y jardín",
        title: "Para personas que quieren cuidar mejor sus plantas",
        description:
          "El feed actual ya conecta bien con esta audiencia: plantas de interior, árboles, cactus y situaciones de antes y después.",
        highlights: [
          "Lenguaje simple y cercano",
          "Valor visible en macetas y jardín",
          "Apto para una narrativa de uso cotidiano",
        ],
      },
      {
        id: "viveros-paisajismo",
        label: "Viveros y paisajismo",
        title: "Para quienes venden, recomiendan o mantienen verde en escala media",
        description:
          "Acá la web tiene que completar más de lo que hoy cuenta Instagram: respaldo comercial, aplicaciones y consistencia de uso.",
        highlights: [
          "Argumentos para recomendación",
          "Uso profesional y repetible",
          "Presentación clara por variante",
        ],
      },
      {
        id: "agro-produccion",
        label: "Producción y agro",
        title: "Para productores, distribuidores y mayoristas",
        description:
          "Es uno de los ejes más visibles del feed, especialmente por las menciones a suelo vivo, bioinsumos y agricultura sustentable.",
        highlights: [
          "Mejorador de suelo",
          "Enfoque orgánico",
          "Narrativa apta para canal comercial",
        ],
      },
      {
        id: "cesped-deportivo",
        label: "Césped deportivo",
        title: "Para golf, fútbol, hockey y mantenimiento de campos",
        description:
          "Es una vertical con mucho potencial y todavía poco desarrollada en la comunicación actual, por eso le damos una sección propia.",
        highlights: [
          "Greens y superficies exigentes",
          "Mantenimiento técnico",
          "Valor visible desde el suelo",
        ],
      },
      {
        id: "cannabis",
        label: "Cannabis",
        title: "Para una audiencia que necesita código y enfoque específicos",
        description:
          "La línea cannabis va a requerir un discurso dedicado. La web ya puede dejar preparada la estructura para esa expansión.",
        highlights: [
          "Landing preparada para crecer",
          "Tono segmentado",
          "Espacio para testimonios propios",
        ],
      },
    ],
    testimonials: [
      {
        audience: "hogar-jardin",
        variant: "regular",
        author: "Lucía M.",
        role: "Jardín urbano",
        quote:
          "Empecé a usar PGI en macetas y noté una mejora clara en el vigor de las plantas. Lo que más me convenció fue ver raíces más activas y mejor respuesta al riego.",
        result: "Mejor respuesta general en plantas de balcón y patio.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-1.svg",
          alt: "Perfil mock de Lucía",
          fallback: "LM",
        },
        evidence: {
          src: "/pgi/testimonials/before-after-lawn-reference.png",
          alt: "Antes y después de un jardín con mejor cobertura verde",
          label: "Antes y después",
          caption: "Un formato visual muy útil para validar mejoras visibles en jardín urbano.",
        },
      },
      {
        audience: "hogar-jardin",
        variant: "regular",
        author: "Martín R.",
        role: "Huerta familiar",
        quote:
          "Buscaba algo simple de incorporar al cuidado de la huerta y PGI me ayudó a ordenar el arranque de los cultivos sin complejizar el manejo.",
        result: "Inicio más prolijo en huerta de escala doméstica.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-2.svg",
          alt: "Perfil mock de Martín",
          fallback: "MR",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-macetas.svg",
          alt: "Collage mock de macetas con evolución de follaje",
          label: "Collage de seguimiento",
          caption: "Ideal para testimonios con aplicación en macetas, balcón o huerta casera.",
        },
      },
      {
        audience: "viveros-paisajismo",
        variant: "citronela",
        author: "Ana P.",
        role: "Asesoramiento en vivero",
        quote:
          "Nos interesa cualquier producto que podamos explicar fácil al cliente final. PGI tiene una promesa clara y la línea con citronela ayuda a diferenciar la propuesta.",
        result: "Mejor narrativa comercial para recomendación en punto de venta.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-3.svg",
          alt: "Perfil mock de Ana",
          fallback: "AP",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-vivero.svg",
          alt: "Bandejas y plantines en entorno de vivero",
          label: "Seguimiento en vivero",
          caption: "Los viveros pueden respaldar la recomendación con resultados visuales simples de leer.",
        },
      },
      {
        audience: "viveros-paisajismo",
        variant: "regular",
        author: "Sofía V.",
        role: "Paisajismo residencial",
        quote:
          "Nos sirve cuando necesitamos una solución que pueda comunicarse bien tanto al cliente como al equipo de mantenimiento.",
        result: "Más consistencia entre proyecto, entrega y cuidado posterior.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-1.svg",
          alt: "Perfil mock de Sofía",
          fallback: "SV",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-paisajismo.svg",
          alt: "Jardín residencial con composición paisajística",
          label: "Aplicación en proyecto",
          caption: "Un collage de obra y post-entrega ayuda a comunicar continuidad del resultado.",
        },
      },
      {
        audience: "agro-produccion",
        variant: "regular",
        author: "Pablo G.",
        role: "Productor",
        quote:
          "Lo que más valoramos es que la conversación pase por suelo, humedad y raíces, no solamente por una promesa genérica de crecimiento.",
        result: "Mejor argumento técnico-comercial para producción.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-4.svg",
          alt: "Perfil mock de Pablo",
          fallback: "PG",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-agro.svg",
          alt: "Parcelas de cultivo con foco en suelo y humedad",
          label: "Seguimiento técnico",
          caption: "Para agro conviene acompañar el testimonio con imágenes comparativas o de lote.",
        },
      },
      {
        audience: "agro-produccion",
        variant: "regular",
        author: "Marcelo S.",
        role: "Distribución",
        quote:
          "Para canal necesitamos productos que puedan explicarse rápido y que tengan espacio para segmentar audiencias. PGI puede crecer bien por esa vía.",
        result: "Potencial claro para distribuidores y mayoristas.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-2.svg",
          alt: "Perfil mock de Marcelo",
          fallback: "MS",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-agro.svg",
          alt: "Material visual de apoyo para canal comercial",
          label: "Material para canal",
          caption: "El mismo caso puede funcionar como pieza de venta para distribuidores y mayoristas.",
        },
      },
      {
        audience: "cesped-deportivo",
        variant: "regular",
        author: "Julián T.",
        role: "Mantenimiento de cancha",
        quote:
          "Nos interesa todo lo que impacte desde el suelo y mejore el comportamiento del césped bajo exigencia. Ahí PGI tiene una historia fuerte para contar.",
        result: "Base de comunicación sólida para canchas y greens.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-2.svg",
          alt: "Perfil mock de Julián",
          fallback: "JT",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-turf.svg",
          alt: "Cancha con franjas de corte y detalle de césped técnico",
          label: "Turf de alto uso",
          caption: "En esta vertical suma mostrar superficie, densidad y respuesta visual del césped.",
        },
      },
      {
        audience: "cesped-deportivo",
        variant: "regular",
        author: "Diego A.",
        role: "Golf",
        quote:
          "Para greens no alcanza con marketing verde: necesitás método, continuidad y un lenguaje técnico. Esta línea puede ir bien si se ordena esa promesa.",
        result: "Buen fit para una vertical premium y especializada.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-4.svg",
          alt: "Perfil mock de Diego",
          fallback: "DA",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-turf.svg",
          alt: "Superficie de césped con terminación prolija en contexto deportivo",
          label: "Resultado técnico",
          caption: "Greens y canchas necesitan casos visuales más sobrios y medibles.",
        },
      },
      {
        audience: "cannabis",
        variant: "cannabis",
        author: "Nicolás F.",
        role: "Cultivo específico",
        quote:
          "Nos interesa que la versión cannabis tenga una comunicación aparte, con testimonios y preguntas frecuentes propias. La estructura de esta home ya deja ese camino abierto.",
        result: "Landing preparada para una expansión segmentada.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-4.svg",
          alt: "Perfil mock de Nicolás",
          fallback: "NF",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-cannabis.svg",
          alt: "Cultivo controlado con seguimiento visual de desarrollo",
          label: "Seguimiento controlado",
          caption: "Para esta línea conviene preparar visuales dedicados con lenguaje propio.",
        },
      },
      {
        audience: "cannabis",
        variant: "cannabis",
        author: "Carla D.",
        role: "Retail de nicho",
        quote:
          "Cuando el producto tiene una versión específica, la diferencia la hace cómo se presenta. Necesita foco, contexto y lenguaje adecuado.",
        result: "Más claridad para una audiencia de nicho.",
        avatar: {
          src: "/pgi/testimonials/avatar-portrait-3.svg",
          alt: "Perfil mock de Carla",
          fallback: "CD",
        },
        evidence: {
          src: "/pgi/testimonials/evidence-cannabis.svg",
          alt: "Panel visual para línea segmentada de cultivo",
          label: "Visual de nicho",
          caption: "El mock ya puede anticipar cómo se verían testimonios con imagen de respaldo.",
        },
      },
    ],
    faq: [
      {
        question: "¿PGI está pensado solo para consumidores finales?",
        answer:
          "No. La estructura de esta home ya contempla varios públicos: consumidores, viveros, paisajistas, producción, distribuidores y mantenimiento de césped deportivo.",
      },
      {
        question: "¿La tienda cambia o se mantiene separada?",
        answer:
          "La tienda se mantiene en la misma app y hoy sigue entrando por /products. La home institucional está pensada para explicar mejor la marca y derivar a compra cuando corresponde.",
      },
      {
        question: "¿Qué variantes del producto se contemplan en esta etapa?",
        answer:
          "Esta versión contempla tres líneas iniciales para comunicar: Regular, Con citronela y Cannabis. Algunas descripciones son base de trabajo y se van a validar con el equipo comercial.",
      },
      {
        question: "¿Los testimonios ya son definitivos?",
        answer:
          "No todavía. La sección ya quedó preparada para segmentar por interés del visitante, pero en esta etapa combina base real de audiencia con copy mockeado para poder avanzar en diseño y estructura.",
      },
      {
        question: "¿El formulario de contacto ya está listo para integrarse con email?",
        answer:
          "Sí, la estructura queda lista para enviar consultas. Si el entorno todavía no tiene configurado Resend o la casilla de destino, el sistema devuelve un error visible en vez de perder mensajes silenciosamente.",
      },
    ],
  },
}
