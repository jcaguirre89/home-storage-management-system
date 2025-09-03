import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase/config';
import { logout } from './lib/firebase/auth';
import { getProfile } from './api/profile'; // Still using mock profile API
import AuthPage from './components/auth/AuthPage';
import HouseholdSetup from './components/household/HouseholdSetup';
import Dashboard from './components/dashboard/Dashboard';

import Header from './components/layout/Header';

// Define a type for our user profile data
interface UserProfile {
  householdId: string | null;
  displayName: string | null;
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
      return <span className="loading loading-dots loading-lg"></span>;
    }

    if (!user) {
      return <AuthPage />;
    }

    if (!userProfile) {
      return <span className="loading loading-dots loading-lg"></span>;
    }

    const mainContent = !userProfile.householdId
      ? <HouseholdSetup onHouseholdCreated={fetchProfile} />
      : <Dashboard />;

    return (
      <div className="drawer">
        <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          <Header />
          {mainContent}
        </div>
        <div className="drawer-side">
          <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <ul className="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
            {/* Sidebar content here */}
            <li><a>{user.displayName}</a></li>
            <li><button onClick={logout} className="btn btn-secondary">Logout</button></li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div data-theme="dark" className="min-h-screen">
      {renderContent()}
    </div>
  );
}

export default App;
