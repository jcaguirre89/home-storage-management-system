import axios from 'axios';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Firebase project ID and function region
const FIREBASE_PROJECT_ID = 'home-storage-management-system'; // From .firebaserc
const FUNCTION_REGION = 'us-central1'; // Default, adjust if different

// Emulator ports (ensure these match your firebase.json)
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8081;
const FUNCTIONS_EMULATOR_PORT = 5001;

const FUNCTIONS_EMULATOR_BASE_URL = `http://localhost:${FUNCTIONS_EMULATOR_PORT}`;

describe('Firebase Functions Integration Tests', () => {
  // Optional: beforeAll/afterAll to start/stop emulators if not running them externally.
  // For this setup, we assume emulators are started before running tests.

  // Set Firebase SDK config to use emulators if these tests were to also use client Firebase SDK.
  // This is generally done in a global setup file for Vitest or Jest.
  // For direct HTTP calls, this is not strictly needed for the call itself,
  // but good practice if the functions interact with emulated Auth/Firestore via SDK.
  beforeAll(() => {
    // For functions that use Firebase Admin SDK, the Admin SDK is auto-configured by emulators
    // when functions are run within the Functions emulator environment.
    // If tests needed to *initialize* Firebase client SDK, they would point to emulators here.
    // e.g. firebase.initializeApp({...}); firebase.auth().useEmulator(...);
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `localhost:${AUTH_EMULATOR_PORT}`;
    process.env.FIRESTORE_EMULATOR_HOST = `localhost:${FIRESTORE_EMULATOR_PORT}`;
    // Note: GCLOUD_PROJECT and FIREBASE_CONFIG are typically set automatically by `firebase emulators:exec`
  });

  describe('GET /test_ping (via direct function call)', () => {
    it('should return a 200 status with a pong message', async () => {
      const functionUrl = `${FUNCTIONS_EMULATOR_BASE_URL}/${FIREBASE_PROJECT_ID}/${FUNCTION_REGION}/test_ping`;

      try {
        const response = await axios.get(functionUrl);
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'pong' });
        expect(response.headers['content-type']).toContain('application/json');
      } catch (error: any) {
        // Log more info if the request itself fails
        if (error.response) {
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
          console.error('Error response headers:', error.response.headers);
        } else if (error.request) {
          console.error('Error request:', error.request);
        } else {
          console.error('Error message:', error.message);
        }
        throw error; // Re-throw to fail the test
      }
    });
  });

  // Add more tests for other functions as needed.
  // For functions that are part of your main 'api' router (e.g., Flask app):
  // The URL would be like: `${FUNCTIONS_EMULATOR_BASE_URL}/${FIREBASE_PROJECT_ID}/${FUNCTION_REGION}/api/your-specific-route`
  // Example for a hypothetical /api/items endpoint (if routed through the 'api' function):
  /*
  describe('GET /api/items (via main API router)', () => {
    it('should return list of items (mocked or empty)', async () => {
      const apiUrl = `${FUNCTIONS_EMULATOR_BASE_URL}/${FIREBASE_PROJECT_ID}/${FUNCTION_REGION}/api/items`;
      // This test would require the 'api' function in main.py to handle /items
      // and potentially interact with emulated Firestore.
      // Authentication would also be a factor: send an Authorization header with a test token.
      try {
        const response = await axios.get(apiUrl, {
          // headers: { Authorization: `Bearer FAKE_ID_TOKEN_FOR_TESTING` } // If auth is needed
        });
        expect(response.status).toBe(200);
        expect(response.data).toBeInstanceOf(Array); // Or match your API response format
      } catch (error: any) {
        if (error.response) {
          console.error('Error response data:', error.response.data);
        }
        throw error;
      }
    });
  });
  */
});