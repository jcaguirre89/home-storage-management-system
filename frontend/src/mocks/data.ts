import type { User } from 'firebase/auth';

// This is a mock of the user object from Firebase Auth
export const mockAuthUser: User = {
  uid: 'test-user-123',
  email: 'user@example.com',
  displayName: 'Test User',
  // Add other properties as needed, but keep them minimal for mocks
} as User;

// This is a mock of the user profile data we would fetch from Firestore
export const mockUserProfile = {
  withHousehold: {
    email: 'user@example.com',
    displayName: 'Test User',
    householdId: 'household-abc',
    created: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  withoutHousehold: {
    email: 'new-user@example.com',
    displayName: 'New User',
    householdId: null,
    created: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
};

export const mockHousehold = {
  id: 'household-abc',
  name: 'The Example Household',
  ownerUserId: 'test-user-123',
  memberUserIds: ['test-user-123'],
  created: new Date().toISOString(),
};

export const mockItems = [
  {
    id: 'item-1',
    name: 'Microphone Stand',
    location: 'A2',
    status: 'STORED',
    creatorUserId: 'test-user-123',
    householdId: 'household-abc',
    isPrivate: false,
    lastUpdated: new Date().toISOString(),
    metadata: {
      category: 'Music Equipment',
      notes: 'Black stand with boom arm'
    }
  },
  {
    id: 'item-2',
    name: 'Winter Clothes',
    location: 'C4',
    status: 'STORED',
    creatorUserId: 'test-user-123',
    householdId: 'household-abc',
    isPrivate: false,
    lastUpdated: new Date().toISOString(),
    metadata: {
      category: 'Clothing',
      notes: 'Vacuum sealed bag'
    }
  },
];
