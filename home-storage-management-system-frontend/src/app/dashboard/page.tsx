'use client';

import { useAuth } from '../../lib/firebase/AuthContext'; // Adjusted path
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { currentUser, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in and auth is not loading
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  const handleLogout = async () => {
    await logout();
    // The onAuthStateChanged listener in AuthContext and RootPage
    // will handle redirecting to /login.
  };

  if (loading || (!currentUser && !loading)) {
    // Display loading or redirect if not authenticated and not loading auth state
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {currentUser?.email}!</p>
      {/* Dashboard content will go here */}
      <button
        onClick={handleLogout}
        style={{ marginTop: '2rem', padding: '0.5rem 1rem', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Logout
      </button>
    </div>
  );
}