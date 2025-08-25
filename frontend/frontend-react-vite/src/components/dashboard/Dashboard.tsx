import React, { useState, useEffect } from 'react';
import { getItems, createItem, deleteItem } from '../../api/items';
import type { Item, ApiResponse } from '../../types/api';

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the new item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');

  // Regex for location validation (e.g., A1, B5)
  const locationRegex = /^[A-Z][1-9]$/;

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response: ApiResponse<Item[]> = await getItems();
      if (response.success && response.data) {
        setItems(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch items.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItemName || !newItemLocation) {
      setError('Please provide a name and location.');
      return;
    }

    if (!locationRegex.test(newItemLocation)) {
      setError('Location must be a capital letter followed by a digit 1-9 (e.g., A1, B5).');
      return;
    }
    try {
      const response: ApiResponse<Item> = await createItem({ name: newItemName, location: newItemLocation });
      if (response.success) {
        setNewItemName('');
        setNewItemLocation('');
        setError(null);
        fetchItems(); // Refetch items after adding
      } else {
        setError(response.error?.message || 'Failed to add item.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response: ApiResponse<Record<string, never>> = await deleteItem(itemId);
        if (response.success) {
          fetchItems(); // Refetch items after deleting
        } else {
          setError(response.error?.message || 'Failed to delete item.');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }
    }
  };

  if (loading) {
    return <p className="text-white">Loading items...</p>;
  }

  return (
    <div className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-4xl">
      <h2 className="text-white text-2xl font-bold mb-6">Dashboard</h2>
      
      {/* Add Item Form */}
      <div className="mb-8">
        <h3 className="text-white text-lg font-semibold mb-4">Add New Item</h3>
        <form onSubmit={handleAddItem} className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Item Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Location (e.g., A1)"
            value={newItemLocation}
            onChange={(e) => setNewItemLocation(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Add
          </button>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* Items List */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Stored Items</h3>
        <div className="space-y-4">
          {items.length > 0 ? (
            items.map(item => (
              <div key={item.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-gray-400 text-sm">Location: {item.location}</p>
                </div>
                <div>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700 font-semibold">
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No items found. Add one above to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;