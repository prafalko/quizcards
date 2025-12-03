// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: (id) => {
          // Externalize specific packages and their submodules during build only
          // In dev mode, Vite resolves these normally from node_modules
          const externalPackages = [
            // Supabase
            "@supabase/ssr",
            "@supabase/supabase-js",
            // React Hook Form
            "react-hook-form",
            "@hookform/resolvers",
            // Radix UI
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-progress",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tooltip",
            // Validation & Schema
            "zod",
            "zod-to-json-schema",
            // AI Service
            "@google/generative-ai",
            // Playwright (used in services)
            "playwright",
          ];

          // Check if the module or any of its submodules should be externalized
          return externalPackages.some((pkg) => id === pkg || id.startsWith(pkg + "/"));
        },
      },
    },
  },
  adapter: node({
    mode: "standalone",
  }),
});
