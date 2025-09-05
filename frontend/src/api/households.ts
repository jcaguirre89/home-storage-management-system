import apiClient from './index';
import type { ApiResponse, ApiError, Household, Room } from '../types/api';
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

export const getRooms = async (householdId: string): Promise<ApiResponse<Room[]>> => {
    try {
        const response = await apiClient.get<ApiResponse<Room[]>>(`/api/households/${householdId}/rooms`);
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

export const createRoom = async (householdId: string, roomData: { name: string; nBins: number }): Promise<ApiResponse<Room>> => {
    try {
        const response = await apiClient.post<ApiResponse<Room>>(`/api/households/${householdId}/rooms`, roomData);
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

export const updateRoom = async (householdId: string, roomId: string, roomData: { name?: string; nBins?: number }): Promise<ApiResponse<Room>> => {
    try {
        const response = await apiClient.put<ApiResponse<Room>>(`/api/households/${householdId}/rooms/${roomId}`, roomData);
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

export const deleteRoom = async (householdId: string, roomId: string): Promise<ApiResponse<null>> => {
    try {
        const response = await apiClient.delete<ApiResponse<null>>(`/api/households/${householdId}/rooms/${roomId}`);
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