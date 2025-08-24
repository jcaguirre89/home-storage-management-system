import { writable, get, type Writable } from 'svelte/store';
import { auth, db } from '../services/firebase';
import { doc, getDoc, type DocumentData, type FirestoreError } from 'firebase/firestore';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  type User as FirebaseUser, // Firebase Auth User type
  type AuthError,
} from 'firebase/auth';

// Mirroring the User interface from project context
export interface AppUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  householdId: string | null;
  // Firestore specific fields from Users collection
  created?: string;
  lastLogin?: string;
}

// Firestore profile data structure (can be extended)
interface UserProfile extends DocumentData {
  displayName: string;
  householdId?: string; // Optional because it might not be set immediately
  created: string;
  lastLogin?: string;
}

export interface AuthStoreValue {
  user: AppUser | null;
  loading: boolean;
  error: AuthError | FirestoreError | Error | null;
  profile: UserProfile | null; // Store the raw profile data separately if needed
}

const initialAuthStoreValue: AuthStoreValue = {
  user: null,
  loading: true,
  error: null,
  profile: null,
};

interface AuthStore extends Writable<AuthStoreValue> {
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const createUserStore = (): AuthStore => {
  const { subscribe, set, update } = writable<AuthStoreValue>(initialAuthStoreValue);

  onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        const userProfileRef = doc(db, 'users', firebaseUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const userProfileData = userProfileSnap.data() as UserProfile;
          const enrichedUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: userProfileData.displayName || firebaseUser.displayName,
            householdId: userProfileData.householdId || null,
            created: userProfileData.created,
            lastLogin: userProfileData.lastLogin,
          };
          set({ user: enrichedUser, profile: userProfileData, loading: false, error: null });
        } else {
          console.warn(`User profile not found in Firestore for UID: ${firebaseUser.uid}.`);
          const basicUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName || firebaseUser.email || 'User',
            householdId: null,
          };
          set({ user: basicUser, profile: null, loading: false, error: null });
        }
      } catch (err) {
        console.error("Error fetching user profile from Firestore:", err);
        const basicUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName || firebaseUser.email || 'User',
          householdId: null,
        };
        set({ user: basicUser, profile: null, loading: false, error: err instanceof Error ? err : new Error(String(err)) });
      }
    } else {
      set(initialAuthStoreValue); // Reset to initial on sign out or no user
    }
  });

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    set({ ...initialAuthStoreValue, loading: true });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle updating the store
      return userCredential.user;
    } catch (err) {
      const error = err as AuthError;
      set({ ...initialAuthStoreValue, loading: false, error });
      console.error("Login error:", error);
      return null;
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<FirebaseUser | null> => {
    set({ ...initialAuthStoreValue, loading: true });
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error?.message || `Backend registration failed: ${response.status}`;
        console.error("Backend user creation failed:", result.error || errorMessage);
        throw new Error(errorMessage);
      }
      // Backend registration successful, now sign in client-side to trigger onAuthStateChanged
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged handles store update
      return userCredential.user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      set({ ...initialAuthStoreValue, loading: false, error });
      console.error("Signup process error:", error);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    // Optimistic update or pre-sign-out state can be complex with onAuthStateChanged.
    // Simplest is to let onAuthStateChanged handle the final state.
    // We can set loading: true here if desired.
    const currentFirebaseUser = auth.currentUser;
    const preSignOutUser = currentFirebaseUser ? {
        uid: currentFirebaseUser.uid,
        email: currentFirebaseUser.email,
        emailVerified: currentFirebaseUser.emailVerified,
        displayName: currentFirebaseUser.displayName,
        householdId: get(user).user?.householdId || null // try to preserve householdId if possible
    } as AppUser : null;

    update(s => ({ ...s, loading: true })); // Indicate loading

    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user to null, profile to null, loading to false.
    } catch (err) {
      const error = err as AuthError;
      console.error("Sign out error:", error);
      // If sign-out fails, onAuthStateChanged might not fire as expected or the user state might be inconsistent.
      // Revert loading and set error. User state might be best left to what onAuthStateChanged determines or a refresh.
      set({ user: preSignOutUser, profile: get(user).profile, loading: false, error });
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const currentStoreValue = get(user); // 'user' is the exported store instance
      update(s => ({ ...s, loading: true, error: null }));

      try {
        const userProfileRef = doc(db, 'users', firebaseUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          const userProfileData = userProfileSnap.data() as UserProfile;
          const enrichedUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: userProfileData.displayName || firebaseUser.displayName,
            householdId: userProfileData.householdId || null,
            created: userProfileData.created,
            lastLogin: userProfileData.lastLogin,
          };
          set({ user: enrichedUser, profile: userProfileData, loading: false, error: null });
        } else {
          console.warn(`User profile not found during refresh for UID: ${firebaseUser.uid}.`);
          const basicUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName || firebaseUser.email || 'User',
            householdId: null,
          };
          set({ user: basicUser, profile: null, loading: false, error: new Error('User profile not found during refresh') });
        }
      } catch (err) {
        console.error("Error refreshing user profile:", err);
        const error = err instanceof Error ? err : new Error(String(err));
        // Preserve existing user data as much as possible from currentStoreValue if appropriate
        set({ ...currentStoreValue, user: currentStoreValue.user, profile: currentStoreValue.profile, loading: false, error });
      }
    } else {
      set(initialAuthStoreValue); // No user, reset store
    }
  };

  return {
    subscribe,
    set,
    update,
    signIn,
    signUp,
    signOut,
    refreshUserProfile,
  };
};

export const user = createUserStore();