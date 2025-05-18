import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173', // Your Svelte app's dev server
    supportFile: false, // Or 'cypress/support/e2e.ts' if you add support commands
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false, // Disable video recording for local runs / CI unless needed
    screenshotOnRunFailure: true,
    // setupNodeEvents(on, config) {
    //   // implement node event listeners here
    // },
  },
});