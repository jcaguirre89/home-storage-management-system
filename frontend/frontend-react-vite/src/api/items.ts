import apiClient from './index';
import type { Item, ApiResponse, ApiError } from '../types/api';
import { AxiosError } from 'axios';

/**
 * Fetches all items for the current household.
 * @returns A promise that resolves with an array of items.
 */
export const getItems = async (): Promise<ApiResponse<Item[]>> => {
  try {
    const response = await apiClient.get<ApiResponse<Item[]>>('/api/items');
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

/**
 * Creates a new item.
 * @param itemData - The data for the new item.
 * @returns A promise that resolves with the created item.
 */
export const createItem = async (itemData: Partial<Item>): Promise<ApiResponse<Item>> => {
  try {
    const response = await apiClient.post<ApiResponse<Item>>('/api/items', itemData);
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

/**
 * Updates an existing item.
 * @param itemId - The ID of the item to update.
 * @param updates - The updates to apply to the item.
 * @returns A promise that resolves with the updated item.
 */
export const updateItem = async (itemId: string, updates: Partial<Item>): Promise<ApiResponse<Item>> => {
  try {
    const response = await apiClient.put<ApiResponse<Item>>(`/api/items/${itemId}`, updates);
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

/**
 * Deletes an item.
 * @param itemId - The ID of the item to delete.
 * @returns A promise that resolves with a success indicator.
 */
export const deleteItem = async (itemId: string): Promise<ApiResponse<Record<string, never>>> => {
  try {
    const response = await apiClient.delete<ApiResponse<Record<string, never>>>(`/api/items/${itemId}`);
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