import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

const PROJECT_ID = `rules-spec-${Date.now()}`;
let testEnv: RulesTestEnvironment;

// Helper to get Firestore DB instance for a given auth state
const getFirestore = (auth: { sub: string; [key: string]: any }) => {
  const { sub, ...tokenClaims } = auth;
  return testEnv.authenticatedContext(sub, tokenClaims).firestore();
};

// Helper to get an unauthenticated Firestore DB instance
const getUnauthedFirestore = () => {
  return testEnv.unauthenticatedContext().firestore();
};

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    // Silence expected rules rejections from Firestore SDK. Default is 'error'
    setLogLevel('warn');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
        host: 'localhost',
        port: 8081,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('users collection', () => {
    const testUserId = 'testUser';
    const anotherUserId = 'anotherUser';
    const userDocPath = `users/${testUserId}`;
    const basicUserData = {
      email: 'user@example.com',
      displayName: 'Test User',
      created: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    it('should allow a user to create their own profile with minimal fields', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await assertSucceeds(setDoc(doc(db, userDocPath), basicUserData));
    });

    it('should NOT allow a user to create a profile for another user', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await assertFails(setDoc(doc(db, `users/${anotherUserId}`), basicUserData));
    });

    it('should allow a user to read their own profile', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), userDocPath), basicUserData);
      });
      await assertSucceeds(getDoc(doc(db, userDocPath)));
    });

    it('should NOT allow a user to read another user profile', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${anotherUserId}`), basicUserData);
      });
      await assertFails(getDoc(doc(db, `users/${anotherUserId}`)));
    });

    it('should allow a user to update their own profile', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), userDocPath), basicUserData);
      });
      await assertSucceeds(updateDoc(doc(db, userDocPath), { displayName: 'Updated Name' }));
    });

    it('should allow a user to update their own profile to add a householdId', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), userDocPath), basicUserData);
      });
      await assertSucceeds(updateDoc(doc(db, userDocPath), { householdId: 'newHouseholdId' }));
      // Verify it's there
      const userDoc = await getDoc(doc(getFirestore({ sub: testUserId, email: 'user@example.com' }), userDocPath));
      expect(userDoc.data()?.householdId).toBe('newHouseholdId');
    });

    it('should allow a user to update their own profile to change an existing householdId', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        // Create with householdId initially using admin powers
        await setDoc(doc(context.firestore(), userDocPath), { ...basicUserData, householdId: 'oldHouseholdId' });
      });
      await assertSucceeds(updateDoc(doc(db, userDocPath), { householdId: 'changedHouseholdId' }));
      const userDoc = await getDoc(doc(getFirestore({ sub: testUserId, email: 'user@example.com' }), userDocPath));
      expect(userDoc.data()?.householdId).toBe('changedHouseholdId');
    });

    it('should allow a user to update their own profile to set householdId to null', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), userDocPath), { ...basicUserData, householdId: 'existingHouseholdId' });
      });
      await assertSucceeds(updateDoc(doc(db, userDocPath), { householdId: null }));
      const userDoc = await getDoc(doc(getFirestore({ sub: testUserId, email: 'user@example.com' }), userDocPath));
      expect(userDoc.data()?.householdId).toBeNull();
    });

    it('should NOT allow a user to update their email', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), userDocPath), basicUserData);
      });
      await assertFails(updateDoc(doc(db, userDocPath), { email: 'newemail@example.com' }));
    });

    it('should NOT allow a user to update their created timestamp', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), userDocPath), basicUserData);
      });
      await assertFails(updateDoc(doc(db, userDocPath), { created: serverTimestamp() })); // or a fixed date
    });

    it('should NOT allow a user to update another user profile', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${anotherUserId}`), basicUserData);
      });
      await assertFails(updateDoc(doc(db, `users/${anotherUserId}`), { displayName: 'Updated Name' }));
    });

    it('should NOT allow creating a user profile with arbitrary fields', async () => {
      const db = getFirestore({ sub: testUserId, email: 'user@example.com' });
      await assertFails(setDoc(doc(db, userDocPath), { ...basicUserData, isAdmin: true }));
    });
  });

  describe('items collection', () => {
    const creatorUid = 'creator1';
    const householdMemberUid = 'member1';
    const otherUserUid = 'otherUser';
    const householdId = 'h1';
    const itemId = 'item123';
    const itemPath = `items/${itemId}`;

    const publicItemData = {
      name: 'Public Item',
      location: 'A1',
      status: 'STORED',
      creatorUserId: creatorUid,
      householdId: householdId,
      isPrivate: false,
      lastUpdated: serverTimestamp(),
    };

    const privateItemData = {
      ...publicItemData,
      name: 'Private Item',
      isPrivate: true,
    };

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, `users/${creatorUid}`), { email: 'c@e.com', householdId: householdId });
        await setDoc(doc(adminDb, `users/${householdMemberUid}`), { email: 'm@e.com', householdId: householdId });
        await setDoc(doc(adminDb, `users/${otherUserUid}`), { email: 'o@e.com', householdId: 'h2' });
      });
    });

    it('should allow creating a public item if user belongs to the household', async () => {
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertSucceeds(setDoc(doc(db, itemPath), publicItemData));
    });

    it('should allow creating a private item', async () => {
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertSucceeds(setDoc(doc(db, itemPath), privateItemData));
    });

    it('should NOT allow creating an item if creatorUserId is not auth.uid', async () => {
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertFails(setDoc(doc(db, itemPath), { ...publicItemData, creatorUserId: 'someoneElse' }));
    });

    it('should NOT allow creating an item if householdId does not match user profile householdId', async () => {
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertFails(setDoc(doc(db, itemPath), { ...publicItemData, householdId: 'wrongHousehold' }));
    });

    it('should NOT allow creating an item if isPrivate is not a boolean', async () => {
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertFails(setDoc(doc(db, itemPath), { ...publicItemData, isPrivate: "true_string" as any }));
    });

    it('should allow creator to read their private item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), privateItemData);
      });
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertSucceeds(getDoc(doc(db, itemPath)));
    });

    it('should NOT allow another user (even in same household) to read a private item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), privateItemData);
      });
      const db = getFirestore({ sub: householdMemberUid, householdId: householdId, email: 'm@e.com' });
      await assertFails(getDoc(doc(db, itemPath)));
    });

    it('should allow any household member to read a public item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), publicItemData);
      });
      const dbCreator = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      const dbMember = getFirestore({ sub: householdMemberUid, householdId: householdId, email: 'm@e.com' });
      await assertSucceeds(getDoc(doc(dbCreator, itemPath)));
      await assertSucceeds(getDoc(doc(dbMember, itemPath)));
    });

    it('should NOT allow a user from a different household to read a public item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), publicItemData);
      });
      const db = getFirestore({ sub: otherUserUid, householdId: 'h2', email: 'o@e.com' });
      await assertFails(getDoc(doc(db, itemPath)));
    });

    it('should allow creator to update their private item', async () => {
       await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), privateItemData);
      });
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertSucceeds(updateDoc(doc(db, itemPath), { location: 'B2' }));
    });

    it('should allow household member to update a public item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), publicItemData);
      });
      const db = getFirestore({ sub: householdMemberUid, householdId: householdId, email: 'm@e.com' });
      await assertSucceeds(updateDoc(doc(db, itemPath), { location: 'B2' }));
    });

    it('should NOT allow updating creatorUserId or householdId on an item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), publicItemData);
      });
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertFails(updateDoc(doc(db, itemPath), { creatorUserId: 'newUser' }));
      await assertFails(updateDoc(doc(db, itemPath), { householdId: 'newHousehold' }));
    });

    it('should allow creator to delete their private item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), privateItemData);
      });
      const db = getFirestore({ sub: creatorUid, householdId: householdId, email: 'c@e.com' });
      await assertSucceeds(deleteDoc(doc(db, itemPath)));
    });

    it('should allow household member to delete a public item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), itemPath), publicItemData);
      });
      const db = getFirestore({ sub: householdMemberUid, householdId: householdId, email: 'm@e.com' });
      await assertSucceeds(deleteDoc(doc(db, itemPath)));
    });
  });

  describe('households collection', () => {
    const ownerUid = 'ownerUser';
    const memberUid = 'memberUser';
    const nonMemberUid = 'nonMemberUser';
    const householdId = 'testHouseholdId';
    const householdPath = `households/${householdId}`;

    const newHouseholdData = (owner: string, members: string[] = [owner]) => ({
      name: 'Test Household',
      ownerUserId: owner,
      memberUserIds: members,
      created: serverTimestamp(),
    });

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, `users/${ownerUid}`), { email: 'owner@e.com', householdId: null });
        await setDoc(doc(adminDb, `users/${memberUid}`), { email: 'member@e.com', householdId: null });
        await setDoc(doc(adminDb, `users/${nonMemberUid}`), { email: 'nonmember@e.com', householdId: 'otherHID' });
      });
    });

    it('should allow a user with no household to create a new household where they are owner and sole member', async () => {
      const db = getFirestore({ sub: ownerUid, householdId: null, email: 'owner@e.com' });
      await assertSucceeds(setDoc(doc(db, householdPath), newHouseholdData(ownerUid)));
    });

    it('should NOT allow creating a household if user already belongs to one', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${ownerUid}`), { email: 'owner@e.com', householdId: 'existingHID' });
      });
      const db = getFirestore({ sub: ownerUid, householdId: 'existingHID', email: 'owner@e.com' });
      await assertFails(setDoc(doc(db, householdPath), newHouseholdData(ownerUid)));
    });

    it('should NOT allow creating a household if ownerUserId is not auth.uid', async () => {
      const db = getFirestore({ sub: ownerUid, householdId: null, email: 'owner@e.com' });
      await assertFails(setDoc(doc(db, householdPath), newHouseholdData('someoneElse')));
    });

    it('should NOT allow creating a household if memberUserIds does not contain only the owner', async () => {
      const db = getFirestore({ sub: ownerUid, householdId: null, email: 'owner@e.com' });
      await assertFails(setDoc(doc(db, householdPath), newHouseholdData(ownerUid, [ownerUid, 'anotherPerson'])));
      await assertFails(setDoc(doc(db, householdPath), newHouseholdData(ownerUid, ['anotherPerson'])));
    });

    it('should allow a member to read their household document', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, householdPath), newHouseholdData(ownerUid, [ownerUid, memberUid]));
        await updateDoc(doc(adminDb, `users/${memberUid}`), { householdId: householdId });
      });

      const db = getFirestore({ sub: memberUid, householdId: householdId, email: 'member@e.com' });
      await assertSucceeds(getDoc(doc(db, householdPath)));
    });

    it('should NOT allow a non-member to read a household document', async () => {
       await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), householdPath), newHouseholdData(ownerUid, [ownerUid]));
        await updateDoc(doc(context.firestore(), `users/${nonMemberUid}`), { householdId: 'someOtherHid' });
      });
      const db = getFirestore({ sub: nonMemberUid, householdId: 'someOtherHid', email: 'nonmember@e.com' });
      await assertFails(getDoc(doc(db, householdPath)));
    });

    it('should allow owner to update household name', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, householdPath), newHouseholdData(ownerUid));
        await updateDoc(doc(adminDb, `users/${ownerUid}`), { householdId: householdId });
      });
      const db = getFirestore({ sub: ownerUid, householdId: householdId, email: 'owner@e.com' });
      await assertSucceeds(updateDoc(doc(db, householdPath), { name: 'New Household Name' }));
    });

    it('should NOT allow non-owner to update household', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, householdPath), newHouseholdData(ownerUid, [ownerUid, memberUid]));
        await updateDoc(doc(adminDb, `users/${memberUid}`), { householdId: householdId });
      });
      const db = getFirestore({ sub: memberUid, householdId: householdId, email: 'member@e.com' });
      await assertFails(updateDoc(doc(db, householdPath), { name: 'Attempted Update By Member' }));
    });

    it('should NOT allow owner to change ownerUserId via update', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, householdPath), newHouseholdData(ownerUid));
        await updateDoc(doc(adminDb, `users/${ownerUid}`), { householdId: householdId });
      });
      const db = getFirestore({ sub: ownerUid, householdId: householdId, email: 'owner@e.com' });
      await assertFails(updateDoc(doc(db, householdPath), { ownerUserId: 'newOwner' }));
    });

    it('should NOT allow owner to change memberUserIds via this simple update rule', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, householdPath), newHouseholdData(ownerUid));
        await updateDoc(doc(adminDb, `users/${ownerUid}`), { householdId: householdId });
      });
      const db = getFirestore({ sub: ownerUid, householdId: householdId, email: 'owner@e.com' });
      await assertFails(updateDoc(doc(db, householdPath), { memberUserIds: [ownerUid, 'newMember'] }));
    });
  });

  describe('General Access rules', () => {
    it('should generally deny reads/writes if not authenticated and not covered by other rules', async () => {
      const unauthedDb = getUnauthedFirestore();
      await assertFails(getDoc(doc(unauthedDb, 'users/anyUser')));
      await assertFails(getDoc(doc(unauthedDb, 'items/anyItem')));
      await assertFails(setDoc(doc(unauthedDb, 'someRandomCollection/someDoc'), { data: 'test' }));
    });
  });
});