import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase/config';
import { logout } from './lib/firebase/auth';
import { getProfile } from './api/profile';
import { bulkImportItems } from './api/items';
import AuthPage from './components/auth/AuthPage';
import HouseholdSetup from './components/household/HouseholdSetup';
import Dashboard from './components/dashboard/Dashboard';
import Header from './components/layout/Header';
import { AxiosError } from 'axios';

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
  const [error, setError] = useState<string | null>(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);

  const fetchProfile = useCallback(async () => {
    console.log('Fetching profile in App.tsx');
    setError(null); // Reset error state
    try {
      const profile = await getProfile();
      setUserProfile(profile as UserProfile);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      const axiosError = err as AxiosError;
      if (axiosError.response && axiosError.response.status === 404) {
        // Profile not found, which is a state we want to handle by logging out
        // the user as their session is now invalid.
        logout();
      } else {
        setError("Failed to fetch your profile. Please try again later.");
      }
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

  const handleHouseholdCreated = () => {
    fetchProfile();
  };

  const handleBulkImportComplete = () => {
    setShowBulkImportModal(false);
    setDashboardKey(prevKey => prevKey + 1);
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-screen"><span className="loading loading-dots loading-lg"></span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <p className="text-red-500">{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
                    Retry
                </button>
            </div>
        );
    }

    if (!user) {
      return <AuthPage />;
    }

    if (!userProfile) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <p>Could not load user profile.</p>
                <button onClick={logout} className="btn btn-secondary mt-4">
                    Logout
                </button>
            </div>
        );
    }

    let mainContent;
    if (!userProfile.householdId) {
      mainContent = <HouseholdSetup onHouseholdCreated={handleHouseholdCreated} />;
    } else {
      mainContent = <Dashboard key={dashboardKey} userProfile={userProfile} />;
    }

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
            
            {userProfile.householdId && <li><button onClick={() => setShowBulkImportModal(true)} className="btn btn-info">Bulk Import</button></li>}
            <li><button onClick={logout} className="btn btn-secondary">Logout</button></li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div data-theme="dark" className="min-h-screen">
      {renderContent()}
      {showBulkImportModal && userProfile?.householdId && (
        <BulkImportModal 
          householdId={userProfile.householdId}
          onClose={() => setShowBulkImportModal(false)}
          onImportComplete={handleBulkImportComplete}
        />
      )}
    </div>
  );
}

interface BulkImportModalProps {
  householdId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ householdId, onClose, onImportComplete }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!csvFile) {
      setError('Please select a CSV file.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await bulkImportItems(csvFile);
      if (response.success) {
        onImportComplete();
      } else {
        setError(response.error?.message || 'Failed to import items.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Bulk Import Items</h3>
        <p className="text-sm mt-2">CSV file must contain 'name', 'roomName', and 'binNumber' columns.</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control w-full">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
              className="file-input file-input-bordered w-full"
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
