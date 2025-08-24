import { writable, type Writable } from 'svelte/store';
import * as api from '../services/api';
import type { Item, ItemFormData, ApiError } from '../types/items'; // Assuming a central types definition

interface ItemsStoreValue {
  items: Item[];
  loading: boolean;
  error: ApiError | Error | null;
}

const initialItemsStoreValue: ItemsStoreValue = {
  items: [],
  loading: true,
  error: null,
};

interface ItemsStore extends Writable<ItemsStoreValue> {
  fetchItems: () => Promise<void>;
  addItem: (itemData: ItemFormData) => Promise<Item | null>; // Assuming ItemFormData is the input type
  editItem: (itemId: string, itemData: Partial<ItemFormData>) => Promise<Item | null>;
  removeItem: (itemId: string) => Promise<void>;
  fetchItemById: (itemId: string) => Promise<Item | null>;
}

const createItemsStore = (): ItemsStore => {
  const { subscribe, set, update } = writable<ItemsStoreValue>(initialItemsStoreValue);

  const fetchItems = async (): Promise<void> => {
    set({ items: [], loading: true, error: null });
    try {
      const response = await api.getItems(); // Assuming api.getItems() returns ApiResponse<Item[]>
      if (response.success && response.data) {
        set({ items: response.data, loading: false, error: null });
      } else {
        console.error("Error fetching items:", response.error);
        set({ items: [], loading: false, error: response.error || new Error('Failed to fetch items') });
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      const error = err instanceof Error ? err : new Error(String(err));
      set({ items: [], loading: false, error });
    }
  };

  const addItem = async (itemData: ItemFormData): Promise<Item | null> => {
    try {
      const response = await api.createItem(itemData); // Assuming api.createItem returns ApiResponse<Item>
      if (response.success && response.data) {
        const newItem = response.data;
        update(current => ({
          ...current,
          items: [...current.items, newItem],
        }));
        return newItem;
      } else {
        console.error("Error adding item:", response.error);
        throw response.error || new Error('Failed to add item');
      }
    } catch (err) {
      console.error("Error adding item:", err);
      throw err; // Re-throw for the component to handle
    }
  };

  const editItem = async (itemId: string, itemData: Partial<ItemFormData>): Promise<Item | null> => {
    try {
      const response = await api.updateItem(itemId, itemData); // Assuming api.updateItem returns ApiResponse<Item>
      if (response.success && response.data) {
        const updatedItem = response.data;
        update(current => ({
          ...current,
          items: current.items.map(item => (item.id === itemId ? updatedItem : item)),
        }));
        return updatedItem;
      } else {
        console.error("Error updating item:", response.error);
        throw response.error || new Error('Failed to update item');
      }
    } catch (err) {
      console.error("Error updating item:", err);
      throw err;
    }
  };

  const removeItem = async (itemId: string): Promise<void> => {
    try {
      const response = await api.deleteItem(itemId); // Assuming api.deleteItem returns ApiResponse<null> or similar
      if (response.success) {
        update(current => ({
          ...current,
          items: current.items.filter(item => item.id !== itemId),
        }));
      } else {
        console.error("Error deleting item:", response.error);
        throw response.error || new Error('Failed to delete item');
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      throw err;
    }
  };

  const fetchItemById = async (itemId: string): Promise<Item | null> => {
    try {
      const response = await api.getItem(itemId); // Assuming api.getItem returns ApiResponse<Item>
      if (response.success && response.data) {
        return response.data;
      } else {
        console.error(`Error fetching item ${itemId}:`, response.error);
        throw response.error || new Error(`Failed to fetch item ${itemId}`);
      }
    } catch (err) {
      console.error(`Error fetching item ${itemId}:`, err);
      throw err;
    }
  };

  return {
    subscribe,
    set, // exposing set and update for flexibility, though not strictly required by initial interface
    update,
    fetchItems,
    addItem,
    editItem,
    removeItem,
    fetchItemById
  };
};

export const itemsStore = createItemsStore();