import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"; // Added for Functions emulator

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // For emulators, this can often be a placeholder like "emulator"
  authDomain: "YOUR_AUTH_DOMAIN", // e.g., "localhost"
  projectId: "YOUR_PROJECT_ID", // Your actual Firebase project ID
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase (example, actual initialization might differ based on v8 vs v9+ SDK)
// For v9+ (modular SDK)

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp); // Initialize Firebase Functions

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  // Make sure your firebase.json has these ports configured
  // For Auth, an HTTP URL is needed, Firestore uses host and port.
  // Functions emulator also uses host and port.
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8081);
    connectFunctionsEmulator(functions, 'localhost', 5001); // Connect Functions emulator
    console.log("Connected to Firebase emulators");
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

export { firebaseApp, auth, db, functions };