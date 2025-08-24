import { mockUserProfile } from '../mocks/data';

// This allows us to simulate the user's state changing during the session.
let hasHousehold = false;

/**
 * A stateful mock API function that simulates fetching the user's profile.
 * The returned profile depends on the internal `hasHousehold` state.
 */
export const getProfile = async () => {
  console.log(`Fetching mock user profile... (hasHousehold: ${hasHousehold})`);

  const profile = hasHousehold
    ? mockUserProfile.withHousehold
    : mockUserProfile.withoutHousehold;

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Mock profile fetched:', profile);
      resolve(profile);
    }, 500);
  });
};

/**
 * A helper function for our mock environment to change the user's household state.
 * In a real app, this would not exist.
 * @param value - Whether the mock user should have a household.
 */
export const _setMockUserHasHousehold = (value: boolean) => {
  console.log(`SETTING MOCK USER HAS HOUSEHOLD TO: ${value}`);
  hasHousehold = value;
};