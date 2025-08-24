import apiClient from './index';

/**
 * Calls the backend API to create a new household.
 * @param name - The name of the household.
 * @returns A promise that resolves with the backend response.
 */
export const createHousehold = async (name: string) => {
  const response = await apiClient.post('/api/households', { name });
  return response.data; // Assuming the actual data is in response.data
};