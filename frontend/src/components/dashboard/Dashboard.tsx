import React, { useState, useEffect } from 'react';
import { getItems, createItem, deleteItem, bulkImportItems } from '../../api/items';
import type { Item, ApiResponse } from '../../types/api';

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the new item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');

  // State for bulk import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);

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

  const handleBulkImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csvFile) {
      setBulkImportError('Please select a CSV file.');
      return;
    }

    setBulkImportLoading(true);
    setBulkImportError(null);

    try {
      const response = await bulkImportItems(csvFile);
      if (response.success) {
        setCsvFile(null);
        fetchItems(); // Refetch items after import
      } else {
        setBulkImportError(response.error?.message || 'Failed to import items.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setBulkImportError(errorMessage);
    } finally {
      setBulkImportLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-lg"></span></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>

      {/* Add Item Form */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h3 className="card-title">Add New Item</h3>
          <form onSubmit={handleAddItem} className="flex items-center gap-4">
            <div className="form-control w-full">
              <input
                type="text"
                placeholder="Item Name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control w-full">
              <input
                type="text"
                placeholder="Location (e.g., A1)"
                value={newItemLocation}
                onChange={(e) => setNewItemLocation(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
          {error && <div className="alert alert-error mt-4">{error}</div>}
        </div>
      </div>

      {/* Bulk Import Form */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h3 className="card-title">Bulk Import Items (CSV)</h3>
          <form onSubmit={handleBulkImport} className="flex items-center gap-4">
            <div className="form-control w-full">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                className="file-input file-input-bordered w-full"
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={bulkImportLoading}>
              {bulkImportLoading ? <span className="loading loading-spinner"></span> : 'Import'}
            </button>
          </form>
          {bulkImportError && <div className="alert alert-error mt-4">{bulkImportError}</div>}
        </div>
      </div>

      {/* Items List */}
      <div>
        <h3 className="text-2xl font-bold mb-4">Stored Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length > 0 ? (
            items.map(item => (
              <div key={item.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h4 className="card-title">{item.name}</h4>
                  <p>Location: {item.location}</p>
                  <div className="card-actions justify-end">
                    <button onClick={() => handleDeleteItem(item.id)} className="btn btn-error btn-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No items found. Add one above to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;