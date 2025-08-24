import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
// import { onAuthStateChanged } from 'firebase/auth';
// import { auth } from './lib/firebase/config';
import { getProfile, _setMockUserHasHousehold } from './api/profile';
import { mockAuthUser } from './mocks/data';
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
    setLoading(true);
    try {
      const profile = await getProfile();
      setUserProfile(profile as UserProfile);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Simulate user being logged in on app start
  useEffect(() => {
    console.log('Simulating user login...');
    setUser(mockAuthUser);
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    // In a real app, this would call Firebase signOut
    console.log('Simulating user logout...');
    setUser(null);
    setUserProfile(null);
    // Reset mock state for next login
    _setMockUserHasHousehold(false);
  };

  const renderContent = () => {
    if (loading) {
      return <h1 className="text-3xl text-white">Loading...</h1>;
    }

    if (!user) {
      // This part is now effectively bypassed by our simulation,
      // but we'll leave it for when we reconnect to Firebase.
      return <AuthPage />;
    }

    if (!userProfile) {
      return <h1 className="text-3xl text-white">Fetching profile...</h1>;
    }

    // Main application content for a logged-in user
    const mainContent = !userProfile.householdId
      ? <HouseholdSetup onHouseholdCreated={fetchProfile} />
      : <Dashboard />;

    return (
      <div>
        <button 
          onClick={handleLogout} 
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Simulate Logout
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