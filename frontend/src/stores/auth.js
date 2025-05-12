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
    set({ user: null, loading: true, error: null });
    try {
      // First, create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Then, call our backend to create the user document in Firestore
      // This matches the flow in your main.py _register_logic
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, displayName }), // Send original password for backend to create user
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // If backend registration fails, we should ideally delete the Firebase Auth user
        // or handle this more gracefully. For now, log error and reflect in store.
        console.error("Backend user creation failed:", result.error);
        // Potentially sign out the newly created auth user if backend part fails
        if (firebaseUser) await firebaseSignOut(auth);
        throw new Error(result.error?.message || 'Backend user registration failed');
      }

      // Auth state will be updated by onAuthStateChanged,
      // or we can set it manually if needed, but onAuthStateChanged is usually sufficient.
      set({ user: firebaseUser, loading: false, error: null });
      return firebaseUser;
    } catch (err) {
      set({ user: null, loading: false, error: err });
      console.error("Signup error:", err);
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