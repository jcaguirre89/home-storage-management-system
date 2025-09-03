import React, { useState } from 'react';
import { createHousehold } from '../../api/households';
import type { ApiError } from '../../types/api';
import { AxiosError } from 'axios';

interface HouseholdSetupProps {
  onHouseholdCreated: () => void;
}

const HouseholdSetup: React.FC<HouseholdSetupProps> = ({ onHouseholdCreated }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Household name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createHousehold(name);
      if (response.success) {
        // On success, call the callback from App.tsx to refresh the profile
        onHouseholdCreated();
      } else {
        setError(response.error?.message || 'Failed to create household.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError;
      const apiError = axiosError.response?.data as ApiError | undefined;
      setError(apiError?.message || axiosError.message || 'Failed to create household.');
      setIsSubmitting(false);
    }
    // No need to set isSubmitting to false on success, as the component will unmount
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Welcome!</h1>
          <p className="py-6">Let's set up your household to get started.</p>
          <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-8">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Household Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g., The Smith Family Home"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="alert alert-error mt-4">{error}</div>
            )}
            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner"></span> : 'Create Household'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HouseholdSetup;