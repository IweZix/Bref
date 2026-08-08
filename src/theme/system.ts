import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

// Visual direction: the subject is compression, links, redirection — not the
// generic rounded-card/purple-gradient SaaS default. Monospace type, a
// dotted-grid backdrop, terminal-prompt inputs, pill status badges.
const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: {
          value: 'var(--font-mono), ui-monospace, "SF Mono", Menlo, monospace',
        },
        body: {
          value: 'var(--font-mono), ui-monospace, "SF Mono", Menlo, monospace',
        },
      },
      colors: {
        brand: {
          50: { value: '#eef6f0' },
          100: { value: '#d3e9d9' },
          200: { value: '#a8d3b4' },
          300: { value: '#7abd8f' },
          400: { value: '#4e9e68' },
          500: { value: '#2f7a4f' },
          600: { value: '#256040' },
          700: { value: '#1c4a32' },
          800: { value: '#153a27' },
          900: { value: '#102c1e' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'app-bg': {
          value: { base: '#faf9f4', _dark: '#15140f' },
        },
        'app-dot': {
          value: { base: '#00000014', _dark: '#ffffff1a' },
        },
        'app-border': {
          value: { base: '#dedad0', _dark: '#3a3830' },
        },
        brand: {
          solid: {
            value: { base: '{colors.brand.600}', _dark: '{colors.brand.400}' },
          },
          contrast: { value: { base: 'white', _dark: 'black' } },
          fg: {
            value: { base: '{colors.brand.700}', _dark: '{colors.brand.300}' },
          },
          muted: {
            value: { base: '{colors.brand.100}', _dark: '{colors.brand.900}' },
          },
          emphasized: {
            value: { base: '{colors.brand.200}', _dark: '{colors.brand.800}' },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
