import axios from 'axios';
import { auth } from '../lib/firebase/config';

const apiClient = axios.create({
  // In a real application, you would get this from an environment variable
  // For the Firebase emulator, the default is usually http://127.0.0.1:5001/<project-id>/<region>/api
  // For a deployed function, it would be your cloud function URL.
  baseURL: 'http://localhost:5001/home-storage-management-system/us-central1/api', 
});

// Add a request interceptor to include the Firebase auth token in headers
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
