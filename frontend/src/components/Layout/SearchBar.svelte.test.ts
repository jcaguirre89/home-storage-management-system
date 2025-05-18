import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from './SearchBar.svelte';

describe('SearchBar.svelte', () => {
  it('renders an input with the correct placeholder', () => {
    const placeholderText = 'Search for items...';
    render(SearchBar, { placeholder: placeholderText });

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
    const { component } = render(SearchBar, { searchTerm: 'initial' });
    const inputElement = screen.getByRole('searchbox') as HTMLInputElement;

    expect(inputElement.value).toBe('initial');

    // Simulate user typing
    await fireEvent.input(inputElement, { target: { value: 'new search' } });

    // In a real scenario with two-way binding, you might check if an event was dispatched
    // or if a parent component received the updated value.
    // For this component, svelte-testing-library updates the component's prop directly.
    expect(component.searchTerm).toBe('new search');
    expect(inputElement.value).toBe('new search');


    // To verify the prop is reactive from the outside
    component.$set({ searchTerm: 'updated from outside' });
    await Promise.resolve(); // Wait for Svelte to propagate changes
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