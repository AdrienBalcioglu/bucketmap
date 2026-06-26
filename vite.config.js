import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ga4Script = (id) => `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
`

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-ga4',
      transformIndexHtml(html) {
        const id = process.env.VITE_GA4_MEASUREMENT_ID
        if (!id || id === 'G-XXXXXXXXXX') return html
        return html.replace(
          '</head>',
          `  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n  <script>${ga4Script(id)}</script>\n  </head>`
        )
      },
    },
  ],
  base: '/',
  optimizeDeps: {
    include: ['react-simple-maps', 'prop-types'],
  },
})
