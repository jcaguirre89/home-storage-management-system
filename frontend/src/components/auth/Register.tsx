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
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <form className="card-body" onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="alert alert-error">{error}</div>
            )}
            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary">Register</button>
            </div>
          </form>
          <p className="text-center p-4">
            Already have an account?{" "}
            <button onClick={onToggle} className="btn btn-link">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
