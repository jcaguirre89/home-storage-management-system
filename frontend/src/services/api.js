import { auth } from './firebase';

const getAuthToken = async () => {
  if (!auth.currentUser) {
    // This case should ideally be handled by auth guards before calling API methods that need auth.
    // If called, it means there's likely a logic error in the UI flow.
    console.warn("Attempted to get auth token when no user is signed in.");
    return null;
  }
  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error("Error getting auth token:", error);
    // Depending on the error, you might want to force a sign-out or redirect to login.
    // For example, if the token is expired and cannot be refreshed.
    if (error.code === 'auth/user-token-expired' || error.code === 'auth/internal-error') {
        // Consider a global event or store update to trigger re-authentication
    }
    return null;
  }
};

const fetchFromApi = async (path, options = {}) => {
  const token = await getAuthToken();
  if (!token && options.requiresAuth !== false) { // Check requiresAuth flag, default true
    throw new Error("User not authenticated or token unavailable.");
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text
      errorData = { error: { message: response.statusText } };
    }
    console.error('API Error:', response.status, errorData);
    const error = new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    error.code = errorData.error?.code;
    error.status = response.status;
    throw error;
  }

  // If response has no content, return success indication or null
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return { success: true, data: null };
  }

  const result = await response.json();
  if (!result.success) {
    console.error('API Call Unsuccessful:', result.error);
    const error = new Error(result.error?.message || 'API operation failed.');
    error.code = result.error?.code;
    throw error;
  }
  return result.data;
};

// Item Management
export const getItems = () => fetchFromApi('/items');
export const getItem = (itemId) => fetchFromApi(`/items/${itemId}`);
export const createItem = (itemData) => fetchFromApi('/items', { method: 'POST', body: JSON.stringify(itemData) });
export const updateItem = (itemId, itemData) => fetchFromApi(`/items/${itemId}`, { method: 'PUT', body: JSON.stringify(itemData) });
export const deleteItem = (itemId) => fetchFromApi(`/items/${itemId}`, { method: 'DELETE' });

// Household Management (as per tech design doc)
export const createHousehold = (householdData) => fetchFromApi('/households', { method: 'POST', body: JSON.stringify(householdData) });

// Auth (though registration is handled by auth store calling /api/register directly)
// Password reset if you implement it in the UI
export const resetPassword = (email) => fetchFromApi('/reset_password', { method: 'POST', body: JSON.stringify({ email }), requiresAuth: false });