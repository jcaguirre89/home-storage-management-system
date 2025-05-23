import { auth } from './firebase';
import type { Item, ItemFormData, ApiResponse, ApiError } from '../types/items'; // Assuming types are in items.ts

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  headers?: Record<string, string>;
}

interface HouseholdData {
  name: string;
  // Add other fields if necessary based on your Household creation endpoint
}

const getAuthToken = async (): Promise<string | null> => {
  if (!auth.currentUser) {
    console.warn("Attempted to get auth token when no user is signed in.");
    return null;
  }
  try {
    return await auth.currentUser.getIdToken();
  } catch (error: any) {
    console.error("Error getting auth token:", error);
    if (error.code === 'auth/user-token-expired' || error.code === 'auth/internal-error') {
      // Consider a global event or store update to trigger re-authentication
    }
    return null;
  }
};

const fetchFromApi = async <T>(path: string, options: FetchOptions = {}): Promise<ApiResponse<T>> => {
  const token = await getAuthToken();
  if (!token && options.requiresAuth !== false) { // Check requiresAuth flag, default true
    return { success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'User not authenticated or token unavailable.' } };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiError | { message: string };
      try {
        const parsedError = await response.json();
        errorData = parsedError.error || { code: 'UNKNOWN_API_ERROR', message: parsedError.message || response.statusText };
      } catch (e) {
        errorData = { code: 'INVALID_JSON_RESPONSE', message: response.statusText };
      }
      console.error('API Error:', response.status, errorData);
      return { success: false, data: null, error: errorData as ApiError };
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return { success: true, data: null, error: null };
    }

    const result = await response.json(); // This should be ApiResponse<T>
    return result;

  } catch (networkError: any) {
    console.error('Network or Fetch API Error:', networkError);
    return { success: false, data: null, error: { code: 'NETWORK_ERROR', message: networkError.message || 'A network error occurred' } };
  }
};

// Item Management
export const getItems = (): Promise<ApiResponse<Item[]>> => fetchFromApi<Item[]>('/items');
export const getItem = (itemId: string): Promise<ApiResponse<Item>> => fetchFromApi<Item>(`/items/${itemId}`);
export const createItem = (itemData: ItemFormData): Promise<ApiResponse<Item>> => fetchFromApi<Item>('/items', { method: 'POST', body: JSON.stringify(itemData) });
export const updateItem = (itemId: string, itemData: Partial<ItemFormData>): Promise<ApiResponse<Item>> => fetchFromApi<Item>(`/items/${itemId}`, { method: 'PUT', body: JSON.stringify(itemData) });
export const deleteItem = (itemId: string): Promise<ApiResponse<null>> => fetchFromApi<null>(`/items/${itemId}`, { method: 'DELETE' });

// Household Management
// Define a proper type for Household creation response if it's not just a success message
export const createHousehold = (householdData: HouseholdData): Promise<ApiResponse<{ id: string } | any>> => fetchFromApi<{ id: string } | any>('/households', { method: 'POST', body: JSON.stringify(householdData) });

// Auth
export const resetPassword = (email: string): Promise<ApiResponse<null>> => fetchFromApi<null>('/reset_password', { method: 'POST', body: JSON.stringify({ email }), requiresAuth: false });