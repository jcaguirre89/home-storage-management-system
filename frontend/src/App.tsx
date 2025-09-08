import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase/config';
import { logout } from './lib/firebase/auth';
import { getProfile } from './api/profile';
import { getItems, bulkImportItems, updateItem } from './api/items';
import { getRooms } from './api/households';
import type { Item, Room } from './types/api';
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
  const [items, setItems] = useState<Item[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
        logout();
      } else {
        setError("Failed to fetch your profile. Please try again later.");
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!userProfile?.householdId) return;
    try {
      setLoading(true);
      const [itemsResponse, roomsResponse] = await Promise.all([
        getItems(),
        getRooms(userProfile.householdId),
      ]);

      if (itemsResponse.success && itemsResponse.data) {
        setItems(itemsResponse.data);
      } else {
        setError(itemsResponse.error?.message || 'Failed to fetch items.');
      }

      if (roomsResponse.success && roomsResponse.data) {
        setRooms(roomsResponse.data);
      } else {
        setError(roomsResponse.error?.message || 'Failed to fetch rooms.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.householdId]);

  useEffect(() => {
    if (userProfile?.householdId) {
      fetchData();
    }
  }, [userProfile?.householdId, dashboardKey, fetchData]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowercasedQuery) ||
      item.metadata?.category?.toLowerCase().includes(lowercasedQuery)
    );
  }, [items, searchQuery]);

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

  const handleUpdateItem = async (item: Item) => {
    const response = await updateItem(item.id, item);
    if (response.success) {
      setEditingItem(null);
      setDashboardKey(prevKey => prevKey + 1);
    } else {
      throw new Error(response.error?.message || 'Failed to update item.');
    }
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
      mainContent = <Dashboard key={dashboardKey} userProfile={userProfile} items={items} onEditItem={setEditingItem} />;
    }

    return (
      <div className="drawer">
        <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col h-screen">
          <Header 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            searchResults={searchResults} 
            rooms={rooms}
            onEditItem={setEditingItem}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
          />
          <main className="flex-1 overflow-y-auto p-4">
            {mainContent}
          </main>
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
          onClose={() => setShowBulkImportModal(false)}
          onImportComplete={handleBulkImportComplete}
        />
      )}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          rooms={rooms}
          onClose={() => setEditingItem(null)}
          onUpdateItem={handleUpdateItem}
        />
      )}
    </div>
  );
}

// ... BulkImportModal



interface BulkImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImportComplete }) => {
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

interface EditItemModalProps {
  item: Item;
  rooms: Room[];
  onClose: () => void;
  onUpdateItem: (item: Item) => Promise<void>;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, rooms, onClose, onUpdateItem }) => {
  const [editedItem, setEditedItem] = useState(item);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onUpdateItem(editedItem);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'category' || name === 'notes') {
        setEditedItem({ ...editedItem, metadata: { ...editedItem.metadata, [name]: value } });
    } else if (name === 'roomId' || name === 'binNumber') {
        setEditedItem({ ...editedItem, location: { ...editedItem.location, [name]: value } });
    } else {
        setEditedItem({ ...editedItem, [name]: value });
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Edit Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Item Name</span></label>
            <input type="text" name="name" className="input input-bordered" value={editedItem.name} onChange={handleChange} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Room</span></label>
            <select name="roomId" className="select select-bordered" value={editedItem.location.roomId} onChange={handleChange}>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Bin Number</span></label>
            <input type="number" name="binNumber" min="1" className="input input-bordered" value={editedItem.location.binNumber} onChange={handleChange} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Status</span></label>
            <select name="status" className="select select-bordered" value={editedItem.status} onChange={handleChange}>
              <option value="STORED">Stored</option>
              <option value="OUT">Out</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Private Item</span> 
              <input type="checkbox" name="isPrivate" checked={editedItem.isPrivate} onChange={e => setEditedItem({ ...editedItem, isPrivate: e.target.checked })} className="checkbox" />
            </label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Category</span></label>
            <input type="text" name="category" className="input input-bordered" value={editedItem.metadata?.category || ''} onChange={handleChange} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Notes</span></label>
            <textarea name="notes" className="textarea textarea-bordered" value={editedItem.metadata?.notes || ''} onChange={handleChange}></textarea>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : 'Update Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
