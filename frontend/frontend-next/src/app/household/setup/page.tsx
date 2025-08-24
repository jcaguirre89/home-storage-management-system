'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/firebase/AuthContext'; // Adjusted path
import { auth } from '../../../lib/firebase/config'; // For getIdToken

export default function HouseholdSetupPage() {
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect if not logged in and auth is not loading
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, authLoading, router]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be logged in to create a household.');
      return;
    }
    if (householdName.trim() === '') {
      setError('Please enter a household name.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/households', { // Assuming rewrite in firebase.json handles this
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: householdName }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error?.message || 'Failed to create household.');
      }

      console.log('Household created:', responseData.data);
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Household creation error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!currentUser && !authLoading)) {
    // Display loading or redirect if not authenticated and not loading auth state
    // This handles the case where the user lands here directly without being authenticated
    return <div>Loading user information...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1>Set Up Your Household</h1>
      <p>Welcome, {currentUser?.email}!</p>
      <form onSubmit={handleCreateHousehold} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
        <div>
          <label htmlFor="householdName">Household Name:</label>
          <input
            type="text"
            id="householdName"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            required
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem', backgroundColor: 'purple', color: 'white', border: 'none', cursor: 'pointer' }}>
          {isSubmitting ? 'Creating...' : 'Create Household'}
        </button>
      </form>
      {/* TODO: Add option to join an existing household */}
    </div>
  );
}