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
    title: "PGI convierte el suelo en un sistema más inteligente para nutrir, hidratar y airear la planta.",
    description:
      "Desarrollado a partir de zeolita volcanica de alta pureza enriquecida con acidos humicos y fulvicos, PGI captura nutrientes, regula la humedad y acompana un desarrollo radicular mas fuerte y eficiente.",
    whatsappUrl:
      "https://wa.me/5491128865141?text=Hola%20PGI%2C%20quiero%20hacer%20una%20consulta%20sobre%20el%20producto.",
    whatsappLabel: "+54 9 11 2886-5141",
    contactEmail: "comercial@pgi.com.ar",
    contactPhone: "+54 9 11 2886-5141",
    location: "Buenos Aires, Argentina",
    heroHighlights: [
      "100% orgánico",
      "Zeolita volcanica de alta pureza",
      "Con acidos humicos y fulvicos",
      "Uso agricola, urbano y profesional",
    ],
    productNarrative: [
      "PGI actua como un gestor biologico del suelo: captura nutrientes, los administra de forma eficiente y los libera segun la demanda de la planta. No reemplaza la fertilizacion; la potencia y ayuda a reducir perdidas.",
      "Gracias a su estructura de micro y macroporos, mejora la aireacion del suelo, regula la humedad y favorece procesos biologicos mas eficientes. Eso lo vuelve relevante tanto para hogar y jardin como para viveros, paisajismo, produccion y cesped deportivo.",
    ],
    benefits: [
      {
        title: "Nutricion mas eficiente",
        description:
          "Captura y administra nutrientes en el suelo para que esten mas disponibles cuando la planta los necesita.",
      },
      {
        title: "Mayor desarrollo radicular",
        description:
          "Acompana un sistema radicular mas fuerte, mejor anclaje y una respuesta mas estable desde la raiz.",
      },
      {
        title: "Regulacion de humedad y aireacion",
        description:
          "Su estructura porosa ayuda a sostener humedad util y a mejorar la oxigenacion del suelo, incluso en terrenos castigados.",
      },
      {
        title: "Mas resistencia al estres",
        description:
          "Contribuye a una planta mas preparada frente a estres hidrico y climatico, con impacto en fotosintesis, floracion y vigor general.",
      },
    ],
    variants: [
      {
        id: "regular",
        name: "PGI Regular",
        badge: "Versión base",
        description:
          "La linea principal para comunicar la propuesta tecnica completa de PGI en suelo, nutricion, hidratacion y desarrollo radicular.",
        useCases: [
          "Hogar y jardín",
          "Huerta urbana",
          "Viveros",
          "Produccion general",
        ],
      },
      {
        id: "citronela",
        name: "PGI con citronela",
        badge: "Línea especial",
        description:
          "Version pensada para sumar una presentacion diferencial en contextos residenciales, exteriores y propuestas comerciales con foco en hogar y jardin.",
        useCases: [
          "Espacios exteriores",
          "Patios y balcones",
          "Paisajismo residencial",
          "Presentacion diferencial",
        ],
      },
      {
        id: "cannabis",
        name: "PGI Cannabis",
        badge: "Línea segmentada",
        description:
          "Version reservada para una comunicacion segmentada. Por ahora la dejamos en un marco descriptivo y prudente hasta consolidar beneficios y casos de uso especificos.",
        useCases: [
          "Cultivo especifico",
          "Growshops",
          "Productores especializados",
          "Comunidad cannabica",
        ],
      },
    ],
    audiences: [
      {
        id: "hogar-jardin",
        label: "Hogar y jardín",
        title: "Para personas que quieren plantas mas fuertes y suelos mejor equilibrados",
        description:
          "Aca PGI se presenta como una ayuda simple pero tecnica: mejor retencion de humedad, mejor aireacion y una base mas estable para macetas, balcones, jardines y huertas.",
        highlights: [
          "Lenguaje simple con respaldo tecnico",
          "Valor visible en macetas y jardin",
          "Uso cotidiano con mejor base de suelo",
        ],
      },
      {
        id: "viveros-paisajismo",
        label: "Viveros y paisajismo",
        title: "Para quienes recomiendan soluciones y necesitan argumentos claros de uso",
        description:
          "En viveros y paisajismo importa tanto el resultado como la explicacion comercial. PGI permite hablar de suelo, humedad, nutrientes y continuidad del mantenimiento en una misma narrativa.",
        highlights: [
          "Argumentos para recomendacion",
          "Uso profesional y repetible",
          "Presentacion clara por variante",
        ],
      },
      {
        id: "agro-produccion",
        label: "Producción y agro",
        title: "Para productores, distribuidores y canal tecnico-comercial",
        description:
          "En agro la propuesta gana fuerza cuando se entiende como mejorador del suelo y complemento de fertilizacion, con foco en eficiencia, retencion y administracion de nutrientes.",
        highlights: [
          "Mejorador de suelo",
          "Complemento de fertilizacion",
          "Narrativa apta para canal comercial",
        ],
      },
      {
        id: "cesped-deportivo",
        label: "Césped deportivo",
        title: "Para golf, futbol, hockey y mantenimiento de superficies exigentes",
        description:
          "Esta vertical puede apoyarse en una promesa concreta: mejor suelo, mejor manejo de humedad y mejor respuesta del cesped bajo uso intensivo y mantenimiento tecnico.",
        highlights: [
          "Greens y superficies exigentes",
          "Mantenimiento tecnico",
          "Valor visible desde el suelo",
        ],
      },
      {
        id: "cannabis",
        label: "Cannabis",
        title: "Para una audiencia que necesita lenguaje, validacion y enfoque propios",
        description:
          "La linea cannabis va a requerir validacion mas fina de beneficios, casos y tono. La web ya deja preparada la estructura para crecer cuando esa informacion este consolidada.",
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
          "No. PGI puede presentarse tanto para uso residencial como para viveros, paisajismo, produccion, distribuidores y mantenimiento de cesped deportivo.",
      },
      {
        question: "¿PGI reemplaza la fertilizacion tradicional?",
        answer:
          "No. PGI no reemplaza la fertilizacion; la potencia. Funciona en conjunto con fertilizantes quimicos, organicos o biologicos para mejorar su aprovechamiento y reducir perdidas.",
      },
      {
        question: "¿Que aporta tecnicamente PGI al suelo?",
        answer:
          "Aporta una estructura de micro y macroporos que ayuda a capturar nutrientes, regular humedad y mejorar aireacion. Eso favorece un suelo mas equilibrado y procesos biologicos mas eficientes.",
      },
      {
        question: "¿La tienda cambia o se mantiene separada?",
        answer:
          "La tienda se mantiene en la misma app y hoy sigue entrando por /products. La home institucional está pensada para explicar mejor la marca y derivar a compra cuando corresponde.",
      },
      {
        question: "¿Qué variantes del producto se contemplan en esta etapa?",
        answer:
          "Esta version contempla tres lineas iniciales para comunicar: Regular, con citronela y Cannabis. La linea cannabis queda deliberadamente mas prudente hasta tener mejor informacion especifica.",
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
