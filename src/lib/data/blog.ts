import { db } from '@/lib/db'

export async function getPublishedArticles(limit?: number) {
  try {
    const articles = await db.article.findMany({
      where: {
        published: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    })
    return articles
  } catch (error) {
    console.error('Error fetching articles:', error)
    return []
  }
}

export async function getArticleBySlug(slug: string) {
  try {
    const article = await db.article.findUnique({
      where: {
        slug,
      },
    })
    return article
  } catch (error) {
    console.error(`Error fetching article with slug ${slug}:`, error)
    return null
  }
}
