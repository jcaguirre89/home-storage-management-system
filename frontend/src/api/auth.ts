import apiClient from './index';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase/config';
import { AxiosError } from 'axios';
import type { ApiResponse, ApiError } from '../types/api';

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
): Promise<ApiResponse<Record<string, never>>> => {
  try {
    const response = await apiClient.post<ApiResponse<Record<string, never>>>('/api/register', { email, password });
    // After successful backend registration, sign the user in client-side
    await signInWithEmailAndPassword(auth, email, password);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const apiError = axiosError.response?.data as ApiError | undefined;
    return {
      success: false,
      data: null,
      error: {
        code: apiError?.code || 'UNKNOWN_ERROR',
        message: apiError?.message || axiosError.message,
      },
    };
  }
};