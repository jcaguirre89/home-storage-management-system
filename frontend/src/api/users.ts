import api from './index';

export const createUser = async (user: { uid: string; email: string | null; displayName: string | null; }) => {
  try {
    const response = await api.post('/users', user);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};
