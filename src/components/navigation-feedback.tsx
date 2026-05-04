"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useSearchParams } from "next/navigation"

type NavigationFeedbackContextValue = {
  startNavigation: () => void
  stopNavigation: () => void
  isNavigating: boolean
}

const NavigationFeedbackContext = createContext<NavigationFeedbackContextValue | null>(null)

function shouldTrackAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false
  if (anchor.hasAttribute("download")) return false

  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#")) return false

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false

  const currentUrl = new URL(window.location.href)
  return url.pathname !== currentUrl.pathname || url.search !== currentUrl.search
}

export function NavigationFeedbackProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const stopNavigation = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsNavigating(false)
  }, [])

  const startNavigation = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsNavigating(true)
    }, 100)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      stopNavigation()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [pathname, searchParams, stopNavigation])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a")
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return

      if (shouldTrackAnchor(anchor)) {
        startNavigation()
      }
    }

    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
    }
  }, [startNavigation])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      startNavigation,
      stopNavigation,
      isNavigating,
    }),
    [isNavigating, startNavigation, stopNavigation]
  )

  return (
    <NavigationFeedbackContext.Provider value={value}>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 origin-left bg-primary transition-all duration-200 ${
          isNavigating ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
        }`}
      />
      {children}
    </NavigationFeedbackContext.Provider>
  )
}

export function useNavigationFeedback() {
  const context = useContext(NavigationFeedbackContext)

  if (!context) {
    throw new Error("useNavigationFeedback must be used within NavigationFeedbackProvider")
  }

  return context
}
