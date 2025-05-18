import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import SearchBar from './SearchBar.svelte';

describe('SearchBar.svelte', () => {
  it('renders the search input field', () => {
    render(SearchBar);
    const inputElement = screen.getByRole('searchbox'); // type="search" maps to role "searchbox"
    expect(inputElement).toBeInTheDocument();
  });

  it('uses the default placeholder if none is provided', () => {
    render(SearchBar);
    const inputElement = screen.getByPlaceholderText('Search...');
    expect(inputElement).toBeInTheDocument();
  });

  it('uses a custom placeholder if provided', () => {
    const customPlaceholder = 'Search for items...';
    render(SearchBar, { props: { placeholder: customPlaceholder } });
    const inputElement = screen.getByPlaceholderText(customPlaceholder);
    expect(inputElement).toBeInTheDocument();
  });

  it('displays the initial searchTerm if provided', () => {
    const initialTerm = 'Initial search';
    render(SearchBar, { props: { searchTerm: initialTerm } });
    const inputElement = screen.getByRole('searchbox');
    expect(inputElement).toHaveValue(initialTerm);
  });

  it('updates the input value when the user types', async () => {
    render(SearchBar);
    const inputElement = screen.getByRole('searchbox') as HTMLInputElement;
    const typedValue = 'New search query';

    await fireEvent.input(inputElement, { target: { value: typedValue } });
    // For bind:value, Svelte Testing Library updates the component's state.
    // We check if the input element's value reflects this change.
    expect(inputElement.value).toBe(typedValue);
  });

  it('binds searchTerm prop correctly (simulating parent update)', async () => {
    const { component } = render(SearchBar, { props: { searchTerm: 'initial' } });
    const inputElement = screen.getByRole('searchbox') as HTMLInputElement;
    expect(inputElement.value).toBe('initial');

    // Simulate parent updating the prop
    await component.$set({ searchTerm: 'updated from parent' });
    expect(inputElement.value).toBe('updated from parent');
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