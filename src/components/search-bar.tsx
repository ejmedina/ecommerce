"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import { useDebounce } from "@/hooks/use-debounce"
import {
  getProductsSearchHref,
  normalizeSearchQuery,
  SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH,
  type SearchSuggestion,
} from "@/lib/search"

const SUGGESTIONS_CACHE_TTL_MS = 60_000
const SUGGESTIONS_DEBOUNCE_MS = 180
const suggestionsCache = new Map<string, { suggestions: SearchSuggestion[]; expiresAt: number }>()

interface SearchBarProps {
  className?: string
  placeholder?: string
  isMobile?: boolean
}

export function SearchBar({ className, placeholder = "Buscar productos...", isMobile = false }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("s") || "")
  const [isPending, startTransition] = useTransition()
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestSequenceRef = useRef(0)
  const listboxId = useId()
  const debouncedQuery = useDebounce(query, SUGGESTIONS_DEBOUNCE_MS)
  const normalizedQuery = normalizeSearchQuery(query)
  const normalizedDebouncedQuery = normalizeSearchQuery(debouncedQuery)
  const totalOptions = suggestions.length + 1

  useEffect(() => {
    if (!showSuggestions || normalizedDebouncedQuery.length < SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH) {
      abortControllerRef.current?.abort()
      return
    }

    const currentRequestSequence = ++requestSequenceRef.current
    abortControllerRef.current?.abort()

    const cacheKey = normalizedDebouncedQuery.toLocaleLowerCase("es-AR")
    const cachedEntry = suggestionsCache.get(cacheKey)

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      queueMicrotask(() => {
        if (currentRequestSequence !== requestSequenceRef.current) {
          return
        }

        setSuggestions(cachedEntry.suggestions)
        setIsLoading(false)
        setActiveIndex(-1)
      })
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    queueMicrotask(() => {
      if (currentRequestSequence !== requestSequenceRef.current || controller.signal.aborted) {
        return
      }

      setIsLoading(true)
    })

    void fetch(`/api/search/suggestions?q=${encodeURIComponent(normalizedDebouncedQuery)}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Suggestions request failed with status ${response.status}`)
        }

        const data = (await response.json()) as { suggestions?: SearchSuggestion[] }

        if (controller.signal.aborted || currentRequestSequence !== requestSequenceRef.current) {
          return
        }

        const nextSuggestions = Array.isArray(data.suggestions) ? data.suggestions : []
        suggestionsCache.set(cacheKey, {
          suggestions: nextSuggestions,
          expiresAt: Date.now() + SUGGESTIONS_CACHE_TTL_MS,
        })
        setSuggestions(nextSuggestions)
        setActiveIndex(-1)
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        console.error("[SEARCH_BAR_SUGGESTIONS_FETCH]", error)

        if (currentRequestSequence === requestSequenceRef.current) {
          setSuggestions([])
          setActiveIndex(-1)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && currentRequestSequence === requestSequenceRef.current) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [normalizedDebouncedQuery, showSuggestions])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const closeSuggestions = () => {
    abortControllerRef.current?.abort()
    setShowSuggestions(false)
    setActiveIndex(-1)
    setIsLoading(false)
  }

  const navigateToResults = () => {
    if (!normalizedQuery) return

    closeSuggestions()
    startTransition(() => {
      router.push(getProductsSearchHref(normalizedQuery))
    })
  }

  const navigateToSuggestion = (suggestion: SearchSuggestion) => {
    closeSuggestions()
    setQuery(suggestion.label)
    startTransition(() => {
      router.push(suggestion.href)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!normalizedQuery) return

    navigateToResults()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeSuggestions()
      return
    }

    if (normalizedQuery.length < SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH) {
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveIndex((currentIndex) => {
        const nextIndex = currentIndex + 1
        return nextIndex >= totalOptions ? 0 : nextIndex
      })
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveIndex((currentIndex) => {
        if (currentIndex <= 0) {
          return totalOptions - 1
        }
        return currentIndex - 1
      })
      return
    }

    if (e.key === "Enter" && showSuggestions && activeIndex >= 0) {
      e.preventDefault()

      if (activeIndex < suggestions.length) {
        navigateToSuggestion(suggestions[activeIndex])
        return
      }

      navigateToResults()
    }
  }

  const activeDescendantId =
    showSuggestions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined

  const shouldShowSuggestions =
    showSuggestions && normalizedQuery.length >= SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH

  const handleSuggestionMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const viewAllLabel = `Buscar todos los resultados para "${normalizedQuery}"`

  return (
    <div ref={wrapperRef} className={cn("relative z-50", className)}>
      <form onSubmit={handleSearch}>
        <div
          className={cn(
            "flex relative items-center w-full rounded-full border border-gray-300 bg-white transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent overflow-hidden",
            isMobile ? "h-10" : "h-11"
          )}
        >
          <input
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={shouldShowSuggestions}
            aria-controls={shouldShowSuggestions ? listboxId : undefined}
            aria-activedescendant={activeDescendantId}
            value={query}
            onChange={(e) => {
              const nextQuery = e.target.value
              setQuery(nextQuery)
              setShowSuggestions(true)
              setActiveIndex(-1)
              setSuggestions([])

              if (normalizeSearchQuery(nextQuery).length < SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH) {
                abortControllerRef.current?.abort()
                setIsLoading(false)
              }
            }}
            onFocus={() => {
              if (normalizedQuery.length >= SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH) {
                setShowSuggestions(true)
              }
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className={cn(
              "flex-1 bg-transparent border-none rounded-l-full focus:outline-none focus:ring-0 transition-all",
              isMobile ? "text-sm px-4 h-full" : "px-4 h-full"
            )}
          />
          <Button
            type="submit"
            isLoading={isPending}
            className={cn(
              "rounded-r-full rounded-l-none font-medium hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px] h-full shadow-none",
              isMobile ? "px-4 text-sm" : "px-6"
            )}
          >
            {!isPending && (
              <>
                <Search className="mr-2 h-4 w-4" />
                <span>Buscar</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {shouldShowSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Buscando...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.href}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <button
                    type="button"
                    onMouseDown={handleSuggestionMouseDown}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateToSuggestion(suggestion)}
                    className={cn(
                      "block w-full px-4 py-3 text-left text-sm transition-colors",
                      activeIndex === index ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span className="block truncate">{suggestion.label}</span>
                  </button>
                </li>
              ))}
              <li
                id={`${listboxId}-option-${suggestions.length}`}
                role="option"
                aria-selected={activeIndex === suggestions.length}
              >
                <button
                  type="button"
                  onMouseDown={handleSuggestionMouseDown}
                  onMouseEnter={() => setActiveIndex(suggestions.length)}
                  onClick={navigateToResults}
                  className={cn(
                    "block w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-primary transition-colors",
                    activeIndex === suggestions.length ? "bg-gray-100" : "bg-gray-50/70 hover:bg-gray-50"
                  )}
                >
                  {viewAllLabel}
                </button>
              </li>
            </ul>
          ) : (
            <ul id={listboxId} role="listbox" className="py-1">
              <li className="px-4 py-3 text-sm text-muted-foreground">No se encontraron coincidencias.</li>
              <li
                id={`${listboxId}-option-0`}
                role="option"
                aria-selected={activeIndex === 0}
              >
                <button
                  type="button"
                  onMouseDown={handleSuggestionMouseDown}
                  onMouseEnter={() => setActiveIndex(0)}
                  onClick={navigateToResults}
                  className={cn(
                    "block w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-primary transition-colors",
                    activeIndex === 0 ? "bg-gray-100" : "bg-gray-50/70 hover:bg-gray-50"
                  )}
                >
                  {viewAllLabel}
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
