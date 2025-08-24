import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

// Mock the imports used by the component
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('../stores/auth', () => ({
  user: {
    subscribe: vi.fn().mockImplementation(callback => {
      // Immediately call with a loading state
      callback({ loading: true });
      // Return a mock function for unsubscribe
      return vi.fn();
    })
  }
}));

describe('/+page.svelte', () => {
  test('should render h1', () => {
    render(Page);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});