import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase config object for production
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development
// Ensure your SvelteKit setup provides a way to check for development mode,
// Vite's `import.meta.env.DEV` is standard.
if (import.meta.env.DEV) {
  console.log("Development mode: Connecting to Firebase Emulators");
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    console.log("Auth Emulator connected");
  } catch (e) {
    console.error("Error connecting to Auth Emulator:", e);
  }
  try {
    connectFirestoreEmulator(db, "localhost", 8081);
    console.log("Firestore Emulator connected");
  } catch (e) {
    console.error("Error connecting to Firestore Emulator:", e);
  }
  // Note: For Functions, API calls are typically proxied by the dev server (see svelte.config.js)
  // or handled by Firebase Hosting emulator rewrites if accessing via the hosting port.
  // No direct `connectFunctionsEmulator` is usually needed in the client SDK for HTTP functions.
}