import apiClient from './index';
import type { ApiResponse, ApiError, Household } from '../types/api';
import { AxiosError } from 'axios';

/**
 * Calls the backend API to create a new household.
 * @param name - The name of the household.
 * @returns A promise that resolves with the backend response.
 */
export const createHousehold = async (name: string): Promise<ApiResponse<Household>> => {
  try {
    const response = await apiClient.post<ApiResponse<Household>>('/api/households', { name });
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