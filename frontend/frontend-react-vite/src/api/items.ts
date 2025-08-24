import { mockItems } from '../mocks/data';

// In-memory store for our mock items to simulate a database.
let items = [...mockItems];

// This is a mock API function. It simulates fetching all items for a household.
export const getItems = async () => {
  console.log('Fetching mock items...');
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Mock items fetched:', items);
      resolve([...items]); // Return a copy to prevent direct mutation
    }, 500);
  });
};

// This is a mock API function for creating an item.
export const createItem = async (itemData) => {
  console.log('Creating mock item:', itemData);
  const newItem = {
    ...itemData,
    id: `item-${Date.now()}`,
    lastUpdated: new Date().toISOString(),
  };
  items.push(newItem);
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Mock item created:', newItem);
      resolve(newItem);
    }, 300);
  });
};

// This is a mock API function for updating an item.
export const updateItem = async (itemId, updates) => {
  console.log(`Updating mock item ${itemId} with:`, updates);
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex > -1) {
    items[itemIndex] = { ...items[itemIndex], ...updates, lastUpdated: new Date().toISOString() };
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Mock item updated:', items[itemIndex]);
        resolve(items[itemIndex]);
      }, 300);
    });
  } else {
    return Promise.reject(new Error('Item not found'));
  }
};

// This is a mock API function for deleting an item.
export const deleteItem = async (itemId) => {
  console.log(`Deleting mock item ${itemId}`);
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex > -1) {
    items.splice(itemIndex, 1);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Mock item deleted');
        resolve({ success: true });
      }, 300);
    });
  } else {
    return Promise.reject(new Error('Item not found'));
  }
};
