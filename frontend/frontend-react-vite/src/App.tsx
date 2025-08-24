import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase/config';
import { logout } from './lib/firebase/auth';
import { getProfile } from './api/profile'; // Still using mock profile API
import AuthPage from './components/auth/AuthPage';
import HouseholdSetup from './components/household/HouseholdSetup';
import Dashboard from './components/dashboard/Dashboard';

// Define a type for our user profile data
interface UserProfile {
  householdId: string | null;
  // add other profile fields as needed
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    console.log('Fetching profile in App.tsx');
    try {
      const profile = await getProfile();
      setUserProfile(profile as UserProfile);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        await fetchProfile();
        setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const renderContent = () => {
    if (loading) {
      return <h1 className="text-3xl text-white">Loading...</h1>;
    }

    if (!user) {
      return <AuthPage />;
    }

    if (!userProfile) {
      return <h1 className="text-3xl text-white">Fetching profile...</h1>;
    }

    const mainContent = !userProfile.householdId
      ? <HouseholdSetup onHouseholdCreated={fetchProfile} />
      : <Dashboard />;

    return (
      <div>
        <button 
          onClick={logout} 
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
        {mainContent}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      {renderContent()}
    </div>
  );
}

export default App;
