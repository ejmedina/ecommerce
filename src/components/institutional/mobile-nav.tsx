"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InstitutionalMobileNavProps {
  storePath?: string
  showBlog?: boolean
}

const navLinks = [
  { label: "Producto", href: "#producto" },
  { label: "Audiencias", href: "#audiencias" },
  { label: "Testimonios", href: "#testimonios" },
  { label: "FAQ", href: "#faq" },
  { label: "Contacto", href: "#contacto" },
]

export function InstitutionalMobileNav({
  storePath = "/products",
  showBlog = false,
}: InstitutionalMobileNavProps) {
  const [open, setOpen] = useState(false)

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <div className="lg:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-950/10 bg-white/80 text-emerald-950 shadow-sm transition-colors hover:bg-emerald-50"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-down menu panel */}
      <div
        className={`fixed inset-x-0 top-[73px] z-40 overflow-hidden border-b border-emerald-950/10 bg-white/96 shadow-xl backdrop-blur-xl transition-all duration-300 ease-in-out ${
          open ? "max-h-screen opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <nav className="mx-auto max-w-7xl divide-y divide-emerald-950/6 px-4 sm:px-6">
          {navLinks.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center py-4 text-base font-medium text-slate-700 transition-colors hover:text-emerald-800"
            >
              {label}
            </a>
          ))}
          {showBlog && (
            <Link
              href="/blog"
              onClick={() => setOpen(false)}
              className="flex items-center py-4 text-base font-medium text-slate-700 transition-colors hover:text-emerald-800"
            >
              Blog
            </Link>
          )}
          <div className="py-5">
            <Button asChild className="w-full rounded-full" onClick={() => setOpen(false)}>
              <Link href={storePath}>
                Tienda
                <ShoppingBag className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </div>
  )
}
