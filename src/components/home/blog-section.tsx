import Link from 'next/link'

interface Article {
  id: string
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  publishedAt: Date
}

interface BlogSectionProps {
  articles: Article[]
  enabled: boolean
  layout: string
}

export function BlogSection({ articles, enabled, layout }: BlogSectionProps) {
  if (!enabled || layout === 'none' || articles.length === 0) return null

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Últimas novedades</h2>
            <p className="text-muted-foreground">Consejos, noticias y artículos de interés.</p>
          </div>
          <Link 
            href="/blog" 
            className="text-primary hover:underline text-sm font-medium hidden sm:block"
          >
            Ver todos los artículos &rarr;
          </Link>
        </div>

        {layout === 'latest' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.slice(0, 3).map((article) => {
              const formattedDate = new Intl.DateTimeFormat('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }).format(new Date(article.publishedAt))

              return (
                <Link 
                  key={article.id} 
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/50 transition-colors shadow-sm hover:shadow-md"
                >
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden flex items-center justify-center">
                    {article.image ? (
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-muted-foreground/50 text-4xl">📝</div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="text-sm text-muted-foreground mb-3">
                      <time dateTime={article.publishedAt.toISOString()}>
                        {formattedDate}
                      </time>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {article.excerpt}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {layout === 'carousel' && (
          <div className="flex overflow-x-auto pb-8 snap-x snap-mandatory gap-6 scrollbar-hide">
            {articles.slice(0, 6).map((article) => {
              const formattedDate = new Intl.DateTimeFormat('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }).format(new Date(article.publishedAt))

              return (
                <Link 
                  key={article.id} 
                  href={`/blog/${article.slug}`}
                  className="group min-w-[280px] sm:min-w-[320px] max-w-[320px] snap-start flex flex-col bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/50 transition-colors shadow-sm hover:shadow-md"
                >
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden flex items-center justify-center">
                    {article.image ? (
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-muted-foreground/50 text-4xl">📝</div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="text-sm text-muted-foreground mb-3">
                      <time dateTime={article.publishedAt.toISOString()}>
                        {formattedDate}
                      </time>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link 
            href="/blog" 
            className="text-primary hover:underline text-sm font-medium"
          >
            Ver todos los artículos &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}
