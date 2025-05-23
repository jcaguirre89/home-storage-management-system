import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase config object for production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Connect to emulators in development
// Vite's `import.meta.env.DEV` is standard for checking development mode.
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