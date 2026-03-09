import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://templar-archives-index.vercel.app'

  // Static routes
  const staticRoutes = [
    '',
    '/about',
    '/archive/tournament',
    '/archive/cash-game',
    '/search',
    '/players',
    '/community',
    '/bookmarks',
    '/profile',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Dynamic routes (can be expanded later with actual data)
  const dynamicRoutes: MetadataRoute.Sitemap = [
    // Players pages will be generated dynamically
    // Community pages will be generated dynamically
  ]

  return [...staticRoutes, ...dynamicRoutes]
}
