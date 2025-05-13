import { writable } from 'svelte/store';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const createUserStore = () => {
  const { subscribe, set } = writable({ user: null, loading: true, error: null });

  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      set({ user: firebaseUser, loading: false, error: null });
    } else {
      set({ user: null, loading: false, error: null });
    }
  });

  const signIn = async (email, password) => {
    set({ user: null, loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Firestore user profile update (lastLogin) could be handled here or via backend trigger
      set({ user: userCredential.user, loading: false, error: null });
      return userCredential.user;
    } catch (err) {
      set({ user: null, loading: false, error: err });
      console.error("Login error:", err);
      return null;
    }
  };
  const signUp = async (email, password, displayName) => {
    set({ user: null, loading: true, error: null }); // Set initial loading state
    try {
      // Step 1: Call your backend API to register the user.
      // The backend will handle creating the user in Firebase Auth and Firestore.
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, displayName }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // If backend registration fails, throw an error to be caught by the catch block.
        const errorMessage = result.error?.message || `Backend registration failed with status: ${response.status}`;
        console.error("Backend user creation failed:", result.error || errorMessage);
        throw new Error(errorMessage);
      }

      // Step 2: Backend registration was successful.
      // Now, sign in the user on the client-side to establish the session
      // and trigger onAuthStateChanged.
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // onAuthStateChanged will handle updating the store with the user,
      // setting loading to false, and error to null.
      // We return the user object from the successful client-side sign-in.
      return userCredential.user;

    } catch (err) {
      // Catch any errors from the fetch call, backend response, or client-side sign-in.
      set({ user: null, loading: false, error: err });
      console.error("Signup process error:", err);
      return null;
    }
  };

  const signOut = async () => {
    set({ user: auth.currentUser, loading: true, error: null }); // Optimistic update for loading state
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user to null
      set({user: null, loading: false, error: null });
    } catch (err) {
      set({ user: auth.currentUser, loading: false, error: err }); // Revert loading, show error
      console.error("Sign out error:", err);
    }
  };

  return {
    subscribe,
    signIn,
    signUp,
    signOut,
  };
};

export const user = createUserStore();