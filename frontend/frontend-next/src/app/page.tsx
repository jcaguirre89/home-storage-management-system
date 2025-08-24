'use client'; // Needs to be a client component to use hooks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/firebase/AuthContext'; // Adjusted path

export default function RootPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loading, router]);

  // Display a loading indicator or null while checking auth state
  // This prevents a flash of content before redirection
  if (loading) {
    return <div>Loading...</div>; // Or a more sophisticated loading spinner
  }

  // This part should ideally not be reached if redirection is quick,
  // but return null if it is, to satisfy component return type.
  return null;
}
