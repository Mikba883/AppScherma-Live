import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      'react', 
      'react-dom',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-primitive',
      '@radix-ui/react-context',
      '@radix-ui/react-compose-refs',
      '@radix-ui/react-slot',
      '@radix-ui/react-use-callback-ref',
    ],
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      '@radix-ui/react-tooltip',
    ],
    force: true,
  },
}));
