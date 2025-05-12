import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:5001',
				changeOrigin: true,
				secure: false,
				// configure: (proxy, _options) => {
				// 	proxy.on('error', (err, _req, _res) => {
				// 		console.log('proxy error', err);
				// 	});
				// 	proxy.on('proxyReq', (proxyReq, req, _res) => {
				// 		console.log('Sending Request to the Target:', req.method, req.url);
				// 	});
				// 	proxy.on('proxyRes', (proxyRes, req, _res) => {
				// 		console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
				// 	});
				// },
				rewrite: (path) => path.replace(/^\/api/, '/home-storage-management-system/us-central1/api/api')
			}
		}
	},
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});