import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type Auth,
  type UserCredential
} from 'firebase/auth';
import { auth } from './config'; // Assuming auth is exported from config

// Note: We will expand these functions to include error handling.

/**
 * Signs in a user with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves with the user credential.
 */
export const login = (email, password): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth as Auth, email, password);
};

/**
 * Registers a new user with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves with the user credential.
 */
export const register = (email, password): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth as Auth, email, password);
};

/**
 * Signs out the current user.
 * @returns A promise that resolves when the sign out is complete.
 */
export const logout = (): Promise<void> => {
  return signOut(auth as Auth);
};
