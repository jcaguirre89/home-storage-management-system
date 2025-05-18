import { render, screen, fireEvent, getAllByRole } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { writable, type Writable } from 'svelte/store'; // Writable will be imported dynamically in vi.hoisted

// Define types for better mock structure clarity (can be simplified with `any` if preferred for mocks)
interface MockAppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  // Add other fields if Header.svelte or its logic depends on them
}

interface MockUserProfile {
  displayName?: string | null;
  photoURL?: string | null;
  bio?: string | null;
  householdId?: string | null;
  // Add other fields if Header.svelte or its logic depends on them
}

// This is the type for the VALUE of the user store ($user)
interface UserStoreValue {
  user: MockAppUser | null;
  loading: boolean;
  error: Error | null;
  profile: MockUserProfile | null;
  // Note: The actual $user value in the real store doesn't have a signOut method.
  // The signOut method is on the store object itself.
}

interface MockPageStoreValue {
  url: URL;
}

const {
  mockGotoFn,
  mockPageStoreInstance,
  hoistedUserStoreMock,      // The mock for the entire 'user' store object from stores/auth.js
  hoistedUserValueStore,     // The writable store that provides the $user value
  hoistedSignOutMethodMock   // The mock for the signOut METHOD on the user store object
} = await vi.hoisted(async () => {
  const { writable } = await import('svelte/store');

  const mockSignOutFn = vi.fn(() => Promise.resolve());
  const userValueWritable = writable<UserStoreValue>({
    user: null,
    loading: true,
    error: null,
    profile: null
  });

  const userStoreObject = {
    subscribe: userValueWritable.subscribe,
    signOut: mockSignOutFn,
    signIn: vi.fn(),
    signUp: vi.fn(),
    refreshUserProfile: vi.fn(),
  };

  return {
    mockGotoFn: vi.fn(),
    mockPageStoreInstance: writable<MockPageStoreValue>({ url: new URL('http://localhost/') }),
    hoistedUserStoreMock: userStoreObject,
    hoistedUserValueStore: userValueWritable,
    hoistedSignOutMethodMock: mockSignOutFn,
  };
});

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
  goto: mockGotoFn,
}));

vi.mock('$app/stores', () => ({
  page: mockPageStoreInstance,
}));

// Mock application stores
vi.mock('../../stores/auth', () => ({
  user: hoistedUserStoreMock
}));

// Import Header component AFTER mocks are set up
import Header from './Header.svelte';


describe('Header.svelte', () => {
  const testUser: MockAppUser = {
    uid: '123',
    email: 'user@example.com',
    displayName: 'Test User',
  };
  const testUserProfile: MockUserProfile = {
    displayName: 'Test User Profile',
    photoURL: 'http://example.com/photo.jpg',
    bio: 'A test user.',
    householdId: 'hid123',
  };

  beforeEach(() => {
    vi.clearAllMocks(); // Clears call counts, etc.

    // Reset page store to default for each test
    mockPageStoreInstance.set({ url: new URL('http://localhost/') });

    // Reset the $user value store to logged-out state
    hoistedUserValueStore.set({
      user: null,
      loading: false,
      error: null,
      profile: null
    });
    // Reset the mock for the user.signOut() method call
    hoistedSignOutMethodMock.mockReset().mockResolvedValue(undefined);

    mockGotoFn.mockReset();
  });

  it('renders Home Storage brand link', () => {
    render(Header);
    const brandLink = screen.getByRole('link', { name: /Home Storage/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/dashboard');
  });

  describe('when user is not logged in', () => {
    it('shows Sign In and Sign Up buttons when not on /login or /register', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/somepage') });
      render(Header);
      expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
    });

    it('does NOT show Sign In and Sign Up buttons on /login page', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/login') });
      render(Header);
      expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
    });

    it('does NOT show Sign In and Sign Up buttons on /register page', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/register') });
      render(Header);
      expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
    });

    it('does not show user-specific links', () => {
      render(Header);
      expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      hoistedUserValueStore.set({
        user: testUser,
        loading: false,
        error: null,
        profile: testUserProfile,
      });
    });

    it('shows Dashboard, My Items, and Manage Household links', () => {
      render(Header);
      const dashboardLinks = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'Dashboard' });
      expect(dashboardLinks.length).toBeGreaterThan(0);
      const itemsLinks = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'My Items' });
      expect(itemsLinks.length).toBeGreaterThan(0);
      const householdLinks = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'Manage Household' });
      expect(householdLinks.length).toBeGreaterThan(0);
    });

    it('shows welcome message with displayName', () => {
      render(Header);
      expect(screen.getByText(`Welcome, ${testUser.displayName}`)).toBeInTheDocument();
    });

    it('shows welcome message with email if displayName is null', () => {
      hoistedUserValueStore.set({
        user: { ...testUser, displayName: null },
        loading: false,
        error: null,
        profile: testUserProfile,
      });
      render(Header);
      expect(screen.getByText(`Welcome, ${testUser.email}`)).toBeInTheDocument();
    });

    it('shows Sign Out button', () => {
      render(Header);
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });

    it('does not show Sign In or Sign Up buttons', () => {
      render(Header);
      expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
    });

    it('calls user.signOut() and navigates to /login on Sign Out click', async () => {
      render(Header);
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
      await fireEvent.click(signOutButton);
      expect(hoistedSignOutMethodMock).toHaveBeenCalledTimes(1);
      expect(mockGotoFn).toHaveBeenCalledWith('/login');
    });
  });

  describe('active link styling', () => {
    const activeClass = 'text-indigo-600'; // Class for active link
    const inactiveClass = 'text-gray-700';
    const isActive = (element: HTMLElement) => element.classList.contains(activeClass) && !element.classList.contains(inactiveClass);

    beforeEach(() => {
      hoistedUserValueStore.set({
        user: testUser,
        loading: false,
        error: null,
        profile: testUserProfile,
      });
    });

    it('applies active style to Dashboard link on /dashboard', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/dashboard') });
      render(Header);
      const dashboardLink = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'Dashboard' })[0];
      expect(isActive(dashboardLink)).toBe(true);
    });

    it('does not apply active style to Dashboard link on other page', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/items') });
      render(Header);
      const dashboardLink = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'Dashboard' })[0];
      expect(isActive(dashboardLink)).toBe(false);
    });

    it('applies active style to My Items link on /items', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/items') });
      render(Header);
      const itemsLink = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'My Items' })[0];
      expect(isActive(itemsLink)).toBe(true);
    });

    it('applies active style to My Items link on /items/some-id', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/items/some-id') });
      render(Header);
      const itemsLink = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'My Items' })[0];
      expect(isActive(itemsLink)).toBe(true);
    });

    it('applies active style to Manage Household link on /household', () => {
      mockPageStoreInstance.set({ url: new URL('http://localhost/household') });
      render(Header);
      const householdLink = getAllByRole(screen.getByRole('navigation'), 'link', { name: 'Manage Household' })[0];
      expect(isActive(householdLink)).toBe(true);
    });
  });
});