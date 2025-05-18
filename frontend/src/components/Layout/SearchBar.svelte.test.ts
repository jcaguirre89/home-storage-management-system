import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import SearchBar from './SearchBar.svelte';

describe('SearchBar.svelte', () => {
  it('renders an input with the correct placeholder', () => {
    const placeholderText = 'Search for items...';
    render(SearchBar, { props: { placeholder: placeholderText } });

    const inputElement = screen.getByPlaceholderText(placeholderText);
    expect(inputElement).toBeInTheDocument();
  });

  it('uses a default placeholder if none is provided', () => {
    render(SearchBar);
    // The default placeholder in the component is 'Search...'
    const inputElement = screen.getByPlaceholderText('Search...');
    expect(inputElement).toBeInTheDocument();
  });

  it('binds the value to the searchTerm prop', async () => {
    // Create a state to track the searchTerm
    let currentSearchTerm = 'initial';

    // Render with a function to update the state when the prop changes
    const { component, rerender } = render(SearchBar, {
      props: {
        searchTerm: currentSearchTerm,
        placeholder: 'Search...'
      }
    });

    const inputElement = screen.getByRole('searchbox') as HTMLInputElement;

    // Check initial value
    expect(inputElement.value).toBe('initial');

    // Simulate user typing
    await fireEvent.input(inputElement, { target: { value: 'new search' } });

    // Check if the input element shows the updated value
    expect(inputElement.value).toBe('new search');

    // To test reactivity in the opposite direction, rerender with new props
    currentSearchTerm = 'updated from outside';
    await rerender({ searchTerm: currentSearchTerm });
    await tick(); // Wait for update cycle

    expect(inputElement.value).toBe('updated from outside');
  });

  it('applies custom classes to the input element', () => {
    // The component has default classes. This test mainly ensures it renders and has some expected structure.
    // More specific class tests can be brittle if styling changes often.
    const placeholderText = 'Test Placeholder';
    render(SearchBar, { placeholder: placeholderText });
    const inputElement = screen.getByPlaceholderText(placeholderText);
    expect(inputElement).toHaveClass('block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 placeholder-gray-400');
  });
});