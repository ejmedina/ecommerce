import { buildWhatsappUrl } from "@/lib/whatsapp"

interface WhatsappWidgetProps {
  enabled: boolean
  phone: string | null
  message: string | null
}

function WhatsappLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.6 2 2.18 6.42 2.18 11.85c0 1.74.45 3.43 1.31 4.93L2 22l5.38-1.41a9.83 9.83 0 0 0 4.65 1.18h.01c5.43 0 9.85-4.42 9.85-9.85 0-2.63-1.03-5.1-2.84-7.01Zm-7.02 15.2h-.01a8.18 8.18 0 0 1-4.16-1.14l-.3-.18-3.19.84.85-3.11-.2-.32a8.16 8.16 0 0 1-1.25-4.35c0-4.51 3.67-8.18 8.19-8.18 2.18 0 4.23.84 5.78 2.4a8.11 8.11 0 0 1 2.39 5.79c0 4.51-3.67 8.18-8.18 8.18Zm4.48-6.12c-.25-.13-1.46-.72-1.69-.8-.22-.08-.38-.13-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.53.06-.25-.13-1.04-.38-1.98-1.21-.73-.65-1.22-1.45-1.36-1.69-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.41.08-.16.04-.3-.02-.42-.06-.13-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41l-.46-.01c-.16 0-.41.06-.62.3-.21.24-.81.79-.81 1.93s.83 2.24.95 2.39c.12.16 1.63 2.49 4.06 3.49.58.25 1.04.4 1.4.51.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.31Z" />
    </svg>
  )
}

export function WhatsappWidget({
  enabled,
  phone,
  message,
}: WhatsappWidgetProps) {
  const whatsappUrl = enabled ? buildWhatsappUrl({ phone, message }) : null

  if (!whatsappUrl) {
    return null
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir WhatsApp"
      className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-3 text-white shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 md:bottom-6 md:right-6"
    >
      <span className="hidden text-sm font-medium md:inline">WhatsApp</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
        <WhatsappLogo className="h-5 w-5" />
      </span>
    </a>
  )
}
