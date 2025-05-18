import { writable, get } from 'svelte/store';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';

const createUserStore = () => {
  const { subscribe, set } = writable({ user: null, loading: true, error: null, profile: null });

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userProfileRef = doc(db, 'users', firebaseUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const userProfileData = userProfileSnap.data();
          // Merge Firebase Auth user with Firestore profile data
          const enrichedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            // Add other essential firebaseUser props if needed
            ...userProfileData, // This will include displayName, householdId, etc.
          };
          set({ user: enrichedUser, profile: userProfileData, loading: false, error: null });
        } else {
          // This case might happen if Firestore document creation is delayed or failed
          // Or for users created before the users collection doc was standard
          console.warn(`User profile not found in Firestore for UID: ${firebaseUser.uid}. Setting user with Firebase Auth data only and null householdId.`);
          set({
            user: {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              displayName: firebaseUser.displayName || firebaseUser.email, // Fallback for displayName
              householdId: null // Explicitly set householdId to null
            },
            profile: null, // No Firestore profile
            loading: false,
            error: null
          });
        }
      } catch (err) {
        console.error("Error fetching user profile from Firestore:", err);
        // Set user with basic Firebase Auth info and error
        set({
            user: {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              displayName: firebaseUser.displayName || firebaseUser.email,
              householdId: null
            },
            profile: null,
            loading: false,
            error: err
        });
      }
    } else {
      set({ user: null, profile: null, loading: false, error: null });
    }
  });

  const signIn = async (email, password) => {
    // Set loading true, user and profile to null initially to reflect ongoing auth process.
    set({ user: null, profile: null, loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle fetching the profile and setting the store
      // so we don't need to duplicate set() here.
      // The userCredential.user is the Firebase Auth user, not our enriched one.
      return userCredential.user; // Still return firebase user for immediate use if needed
    } catch (err) {
      set({ user: null, profile: null, loading: false, error: err });
      console.error("Login error:", err);
      return null;
    }
  };

  const signUp = async (email, password, displayName) => {
    // Set loading true, user and profile to null.
    set({ user: null, profile: null, loading: true, error: null });
    try {
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
      // Note: userCredential.user is the Firebase Auth user.
      // The actual enriched user object will be set in the store by onAuthStateChanged.
      return userCredential.user;

    } catch (err) {
      // Catch any errors from the fetch call, backend response, or client-side sign-in.
      set({ user: null, profile: null, loading: false, error: err });
      console.error("Signup process error:", err);
      return null;
    }
  };

  const signOut = async () => {
    const currentUserBeforeSignOut = auth.currentUser; // Get current user for optimistic update
    set({ user: currentUserBeforeSignOut ? { uid: currentUserBeforeSignOut.uid, email: currentUserBeforeSignOut.email, householdId: null } : null, profile: null, loading: true, error: null });
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user and profile to null
      // set({user: null, profile: null, loading: false, error: null }); // This is handled by onAuthStateChanged
    } catch (err) {
      console.error("Sign out error:", err);
      // Attempt to revert to the user state before sign-out attempt if an error occurs,
      // though onAuthStateChanged might have already cleared it or kept it.
      // It's safer to let onAuthStateChanged be the source of truth.
      // For simplicity, ensure loading is false and error is set.
      set({ user: currentUserBeforeSignOut ? { uid: currentUserBeforeSignOut.uid, email: currentUserBeforeSignOut.email, householdId: null } : null, profile: null, loading: false, error: err });
    }
  };

  // Function to allow explicit refresh or update of user profile (e.g., after household creation)
  const refreshUserProfile = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      // Get the current store value to preserve parts of it if refresh fails partially
      const currentStoreValue = get(user); // Use imported 'get'

      // Indicate loading for the profile part by setting loading: true, but preserve user object
      set({ ...currentStoreValue, loading: true, error: null });

      try {
        const userProfileRef = doc(db, 'users', firebaseUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          const userProfileData = userProfileSnap.data();
          const enrichedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            ...userProfileData,
          };
          set({ user: enrichedUser, profile: userProfileData, loading: false, error: null });
        } else {
          console.warn(`User profile not found during refresh for UID: ${firebaseUser.uid}.`);
          // Keep existing firebase auth part of user, but clear profile and indicate error
          set({
            user: { // Reconstruct basic user from firebaseUser if profile is gone
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              displayName: firebaseUser.displayName || firebaseUser.email,
              householdId: null // Profile gone, so no householdId from it
            },
            profile: null,
            loading: false,
            error: new Error('User profile not found during refresh')
          });
        }
      } catch (err) {
        console.error("Error refreshing user profile:", err);
        // Preserve existing user data as much as possible, set error, stop loading
        set({ ...currentStoreValue, loading: false, error: err });
      }
    } else {
      // No user logged in, nothing to refresh. Ensure store is cleared.
      set({ user: null, profile: null, loading: false, error: null });
    }
  };

  return {
    subscribe,
    signIn,
    signUp,
    signOut,
    refreshUserProfile // Exposed the refresh function
  };
};

export const user = createUserStore();

// Helper to get current store value if needed outside components, e.g. in refreshUserProfile
// Note: this is generally for use within the store module itself or very controlled scenarios.
// Svelte's 'get' utility is for reading store values once.
// import { get } from 'svelte/store'; // would be needed at top
// const currentStoreValue = get(user);