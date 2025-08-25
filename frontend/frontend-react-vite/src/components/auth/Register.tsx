import React, { useState } from 'react';
import { register } from '../../api/auth';
import type { ApiResponse } from '../../types/api';
import { AxiosError } from 'axios';

// This component is very similar to Login.tsx. In a real-world app,
// you might combine them or use a shared form component.

interface RegisterProps {
  onToggle: () => void;
}

const Register: React.FC<RegisterProps> = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const response = await register(email, password);
      if (!response.success) {
        setError(response.error?.message || 'Failed to register.');
      }
      // On successful registration, the user will be logged in automatically
      // by the backend, and the onAuthStateChanged listener in App.tsx
      // will handle showing the main application content.
    } catch (err: unknown) {
      const axiosError = err as AxiosError;
      if (axiosError.response && axiosError.response.data) {
        const apiResponse = axiosError.response.data as ApiResponse<unknown>;
        if (apiResponse.error) {
          const errorCode = apiResponse.error.code;
          if (errorCode === 'EMAIL_ALREADY_EXISTS') {
            setError('This email address is already in use.');
          } else {
            setError(apiResponse.error.message || 'Failed to register.');
          }
        } else {
          setError(axiosError.message || 'An unexpected error occurred.');
        }
      } else {
        setError(axiosError.message || 'An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-white text-2xl font-bold mb-6 text-center">Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="******************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="bg-red-500 text-white text-xs italic p-3 rounded mb-4">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
            >
              Sign Up
            </button>
          </div>
        </form>
        <p className="text-center text-gray-500 text-xs mt-4">
          Already have an account?{' '}
          <button onClick={onToggle} className="text-blue-500 hover:text-blue-700 font-bold">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
