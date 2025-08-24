import { writable, get, type Writable } from 'svelte/store';
import { user, type AuthStoreValue, type AppUser } from './auth'; // Assuming user store is in auth.ts
import { db } from '../services/firebase'; // Firebase db instance
import { doc, getDoc, onSnapshot, type Unsubscribe, type DocumentData, type FirestoreError } from 'firebase/firestore';

interface Household {
  id: string | null;
  name: string;
  ownerUserId: string;
  memberUserIds: string[];
  loading: boolean;
  error: Error | FirestoreError | null;
  // any other household fields from your data model
  created?: string; // Assuming this might be part of your model
}

const initialHouseholdState: Household = {
  id: null,
  name: '',
  ownerUserId: '',
  memberUserIds: [],
  loading: true,
  error: null,
};

interface HouseholdStore extends Writable<Household> {
  refreshHousehold: () => Promise<void>;
}

function createHouseholdStore(): HouseholdStore {
  const { subscribe, set, update } = writable<Household>(initialHouseholdState);
  let householdUnsubscribe: Unsubscribe | null = null; // To store onSnapshot listener unsubscribe function

  user.subscribe(async ($user: AuthStoreValue) => {
    if (householdUnsubscribe) {
      householdUnsubscribe(); // Unsubscribe from previous household listener
      householdUnsubscribe = null;
    }

    const appUser = $user.user as AppUser | null; // Use AppUser type

    if (appUser && appUser.householdId) {
      set({ ...initialHouseholdState, id: appUser.householdId, loading: true, error: null });
      const householdId = appUser.householdId;
      const householdRef = doc(db, 'households', householdId);

      householdUnsubscribe = onSnapshot(householdRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as DocumentData; // Explicitly type docSnap.data()
            set({
              id: docSnap.id,
              name: data.name || '', // Provide defaults for safety
              ownerUserId: data.ownerUserId || '',
              memberUserIds: data.memberUserIds || [],
              created: data.created,
              loading: false,
              error: null,
            });
          } else {
            console.warn(`Household document not found for ID: ${householdId}`);
            set({ ...initialHouseholdState, id: householdId, loading: false, error: new Error('Household not found') });
          }
        },
        (err: FirestoreError) => {
          console.error(`Error fetching household ${householdId}:`, err);
          set({ ...initialHouseholdState, id: householdId, loading: false, error: err });
        }
      );
    } else {
      // User is not logged in or doesn't have a householdId
      set(initialHouseholdState);
    }
  });

  const refreshHousehold = async (): Promise<void> => {
    const currentUserState: AuthStoreValue = get(user);
    const appUser = currentUserState.user as AppUser | null;

    if (appUser && appUser.householdId) {
      const householdId = appUser.householdId;
      update(s => ({ ...s, loading: true, error: null }));
      try {
        const householdRef = doc(db, 'households', householdId);
        const docSnap = await getDoc(householdRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          set({
            id: docSnap.id,
            name: data.name || '',
            ownerUserId: data.ownerUserId || '',
            memberUserIds: data.memberUserIds || [],
            created: data.created,
            loading: false,
            error: null,
          });
        } else {
          set({ ...initialHouseholdState, id: householdId, loading: false, error: new Error('Household not found') });
        }
      } catch (err) {
        console.error(`Error manually refreshing household ${householdId}:`, err);
        const error = err instanceof Error ? err : new Error(String(err));
        update(s => ({ ...s, loading: false, error }));
      }
    } else {
      // No user or householdId, reset to initial state
      set(initialHouseholdState);
    }
  };

  return {
    subscribe,
    set, // include set and update if they are to be exposed
    update,
    refreshHousehold,
  };
}

export const householdStore = createHouseholdStore();