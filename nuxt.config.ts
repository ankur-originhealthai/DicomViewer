// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from "@tailwindcss/vite";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs"

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  ssr: false,
  css: ['~/assets/css/main.css'],
  app: {
    baseURL: '/cornerstone3D-with-Nuxt3/'
  },
  vite:{
    plugins: [
      tailwindcss(),
      viteCommonjs(),
    ],
    optimizeDeps: {
    exclude: ["@cornerstonejs/dicom-image-loader"],
    include: ["dicom-parser"],
  },
  },
  build: {
    transpile: ['lodash-es']
  },
   modules: ['nuxt-icon'],
})
