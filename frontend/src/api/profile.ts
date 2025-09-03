import apiClient from './index';

/**
 * Calls the backend API to fetch the authenticated user's profile.
 * @returns A promise that resolves with the user's profile data.
 */
export const getProfile = async () => {
  const response = await apiClient.get('/api/profile');
  return response.data.data; // Assuming the actual profile data is nested under response.data.data
};