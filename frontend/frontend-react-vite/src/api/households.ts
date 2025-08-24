import { mockHousehold } from '../mocks/data';
import { _setMockUserHasHousehold } from './profile';

// This is a mock API function. It simulates creating a new household.
export const createHousehold = async (name: string) => {
  console.log(`Creating mock household with name: ${name}`);

  const newHousehold = {
    ...mockHousehold,
    id: `new-household-${Date.now()}`,
    name: name,
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate success by updating our mock state
      _setMockUserHasHousehold(true);
      console.log('Mock household created:', newHousehold);
      resolve(newHousehold);
    }, 500);
  });
};