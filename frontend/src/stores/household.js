import { writable, get } from 'svelte/store';
import { user } from './auth'; // Assuming user store is in auth.js
import { db } from '../services/firebase'; // Firebase db instance
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const initialHouseholdState = {
  id: null,
  name: '',
  ownerUserId: '',
  memberUserIds: [],
  // any other household fields from your data model
  loading: true,
  error: null,
};

function createHouseholdStore() {
  const { subscribe, set, update } = writable(initialHouseholdState);
  let householdUnsubscribe = null; // To store onSnapshot listener unsubscribe function

  user.subscribe(async ($user) => {
    if (householdUnsubscribe) {
      householdUnsubscribe(); // Unsubscribe from previous household listener
      householdUnsubscribe = null;
    }

    if ($user && $user.user && $user.user.householdId) {
      set({ ...initialHouseholdState, id: $user.user.householdId, loading: true, error: null });
      const householdId = $user.user.householdId;
      const householdRef = doc(db, 'households', householdId);

      householdUnsubscribe = onSnapshot(householdRef, (docSnap) => {
        if (docSnap.exists()) {
          set({
            id: docSnap.id,
            ...docSnap.data(),
            loading: false,
            error: null,
          });
        } else {
          console.warn(`Household document not found for ID: ${householdId}`);
          set({ ...initialHouseholdState, id: householdId, loading: false, error: new Error('Household not found') });
        }
      }, (err) => {
        console.error(`Error fetching household ${householdId}:`, err);
        set({ ...initialHouseholdState, id: householdId, loading: false, error: err });
      });
    } else {
      // User is not logged in or doesn't have a householdId
      set(initialHouseholdState);
    }
  });

  // Function to manually refresh household data if needed, though onSnapshot handles real-time updates
  const refreshHousehold = async () => {
    const currentUserState = get(user);
    if (currentUserState && currentUserState.user && currentUserState.user.householdId) {
      const householdId = currentUserState.user.householdId;
      update(s => ({ ...s, loading: true, error: null }));
      try {
        const householdRef = doc(db, 'households', householdId);
        const docSnap = await getDoc(householdRef);
        if (docSnap.exists()) {
          set({
            id: docSnap.id,
            ...docSnap.data(),
            loading: false,
            error: null,
          });
        } else {
          set({ ...initialHouseholdState, id: householdId, loading: false, error: new Error('Household not found') });
        }
      } catch (err) {
        console.error(`Error manually refreshing household ${householdId}:`, err);
        update(s => ({ ...s, loading: false, error: err }));
      }
    } else {
      // No user or householdId, reset to initial state
      set(initialHouseholdState);
    }
  };

  return {
    subscribe,
    refreshHousehold,
    // Expose a way to get the householdId if needed, though it's reactive via subscribe
    // getHouseholdId: () => get({subscribe}).id // Example, might not be necessary
  };
}

export const householdStore = createHouseholdStore();