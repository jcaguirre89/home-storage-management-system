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
    <div className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-white text-2xl font-bold mb-4 text-center">Welcome!</h2>
      <p className="text-center text-gray-400 mb-6">Let's set up your household to get started.</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="householdName">
            Household Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline"
            id="householdName"
            type="text"
            placeholder="e.g., The Smith Family Home"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {error && (
          <p className="bg-red-500 text-white text-xs italic p-3 rounded mb-4">{error}</p>
        )}
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:bg-gray-500"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Household'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HouseholdSetup;