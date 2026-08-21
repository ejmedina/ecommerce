import { getArticleBySlug } from '@/lib/data/blog'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug)
  if (!article) {
    return { title: 'Artículo no encontrado' }
  }
  return {
    title: `${article.title} | Blog`,
    description: article.excerpt || article.title,
  }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const settings = await db.storeSettings.findFirst()
  
  if (!settings?.blogEnabled) {
    notFound()
  }

  const article = await getArticleBySlug(params.slug)

  if (!article) {
    notFound()
  }

  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(article.publishedAt))

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <Link 
          href="/blog" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al blog
        </Link>
      </div>

      <article className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        {article.image && (
          <div className="aspect-[21/9] bg-muted relative overflow-hidden flex items-center justify-center">
            <img 
              src={article.image} 
              alt={article.title}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        
        <div className="p-8 md:p-12">
          <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <time dateTime={article.publishedAt.toISOString()}>
              {formattedDate}
            </time>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
            {article.title}
          </h1>
          
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {article.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>
    </div>
  )
}
