import { writable } from 'svelte/store';
import * as api from '../services/api';

const createItemsStore = () => {
  const { subscribe, set, update } = writable({ items: [], loading: true, error: null });

  const fetchItems = async () => {
    set({ items: [], loading: true, error: null });
    try {
      const fetchedItems = await api.getItems();
      set({ items: fetchedItems || [], loading: false, error: null });
    } catch (err) {
      console.error("Error fetching items:", err);
      set({ items: [], loading: false, error: err });
    }
  };

  const addItem = async (itemData) => {
    try {
      const newItem = await api.createItem(itemData);
      update(current => ({
        ...current,
        items: [...current.items, newItem],
      }));
      return newItem;
    } catch (err) {
      console.error("Error adding item:", err);
      // Optionally update store with error for this specific action
      throw err; // Re-throw for the component to handle
    }
  };

  const editItem = async (itemId, itemData) => {
    try {
      const updatedItem = await api.updateItem(itemId, itemData);
      update(current => ({
        ...current,
        items: current.items.map(item => (item.id === itemId ? updatedItem : item)),
      }));
      return updatedItem;
    } catch (err) {
      console.error("Error updating item:", err);
      throw err;
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.deleteItem(itemId);
      update(current => ({
        ...current,
        items: current.items.filter(item => item.id !== itemId),
      }));
    } catch (err) {
      console.error("Error deleting item:", err);
      throw err;
    }
  };

  // Function to fetch a single item, not stored in the main list store
  // but useful for an item detail page.
  const fetchItemById = async (itemId) => {
    try {
      const item = await api.getItem(itemId);
      return item;
    } catch (err) {
      console.error(`Error fetching item ${itemId}:`, err);
      throw err;
    }
  };

  return {
    subscribe,
    fetchItems,
    addItem,
    editItem,
    removeItem,
    fetchItemById
  };
};

export const itemsStore = createItemsStore();