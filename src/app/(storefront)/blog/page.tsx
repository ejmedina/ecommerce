import { getPublishedArticles } from '@/lib/data/blog'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Blog | Novedades y Artículos',
  description: 'Descubre las últimas novedades, guías y artículos de nuestro blog.',
}

export default async function BlogPage() {
  const settings = await db.storeSettings.findFirst()
  
  // If blog is disabled in settings, return 404
  if (!settings?.blogEnabled) {
    notFound()
  }

  const articles = await getPublishedArticles()

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-muted-foreground text-lg">
          Novedades, guías y noticias
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Aún no hay artículos publicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => {
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
                {/* Image placeholder or actual image */}
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
                  <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <time dateTime={article.publishedAt.toISOString()}>
                      {formattedDate}
                    </time>
                  </div>
                  <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {article.excerpt}
                  </p>
                  <div className="mt-auto pt-4">
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Leer más <span aria-hidden="true">&rarr;</span>
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
