import apiClient from './index';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase/config';
import { type AxiosResponse } from 'axios'; // <-- Import the specific type

/**
 * Calls the backend API to register a new user.
 * The backend will handle creating the user in Firebase Auth and
 * creating the user profile document in Firestore.
 * After successful backend registration, it signs the user in client-side.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves with the backend response.
 */
export const register = async (
  email: string,
  password: string
): Promise<AxiosResponse<any>> => { // <-- Use a more specific return type
  const response = await apiClient.post('/api/register', { email, password });
  // After successful backend registration, sign the user in client-side
  await signInWithEmailAndPassword(auth, email, password);
  return response;
};