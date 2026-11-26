import react from '@vitejs/plugin-react'
import { AsyncLocalStorage } from 'node:async_hooks'
import { defineConfig, loadEnv } from 'vite'
import { wedding } from './src/content.ts'

const previewHosts = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev', '.ngrok.io']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  if (siteUrl && !/^https?:\/\//.test(siteUrl)) throw new Error('SITE_URL must be a full http:// or https:// URL')
  const metadata = wedding.metadata
  const requestOrigin = new AsyncLocalStorage<string>()
  return {
    plugins: [react(), {
      name: 'invitation-metadata',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const url = URL.parse(`http://${request.headers.host || ''}`)
          let origin = ''
          if (url && previewHosts.some(suffix => url.hostname.endsWith(suffix))) {
            origin = `https://${url.host}`
          } else if (url && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
            origin = url.origin
          }
          requestOrigin.run(origin, next)
        })
      },
      transformIndexHtml() {
        const origin = siteUrl || requestOrigin.getStore()
        const image = origin ? new URL(metadata.image, origin).href : metadata.image
        return [
          { tag: 'title', children: metadata.title, injectTo: 'head' as const },
          { tag: 'link', attrs: { rel: 'shortcut icon', type: 'image/x-icon', href: metadata.fallbackIcon }, injectTo: 'head' as const },
          { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: metadata.favicon }, injectTo: 'head' as const },
          ...[
            ['name', 'description', metadata.description],
            ['property', 'og:type', 'website'],
            ['property', 'og:title', metadata.title],
            ['property', 'og:description', metadata.description],
            ['property', 'og:image', image],
            ['property', 'og:image:type', metadata.imageType],
            ['property', 'og:image:width', String(metadata.imageWidth)],
            ['property', 'og:image:height', String(metadata.imageHeight)],
            ['property', 'og:image:alt', metadata.imageAlt],
            ['name', 'twitter:card', 'summary_large_image'],
            ['name', 'twitter:title', metadata.title],
            ['name', 'twitter:description', metadata.description],
            ['name', 'twitter:image', image],
            ['name', 'twitter:image:alt', metadata.imageAlt],
          ].map(([attribute, key, content]) => ({
            tag: 'meta', attrs: { [attribute]: key, content }, injectTo: 'head' as const,
          })),
        ]
      },
    }],
    server: {
      // Allow ngrok preview tunnels, not arbitrary external hosts.
      allowedHosts: previewHosts,
    },
  }
})
