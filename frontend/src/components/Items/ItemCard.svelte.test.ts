import { render, screen, fireEvent, getByRole, getByLabelText } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Use vi.hoisted to ensure mock functions are initialized before vi.mock factories
const {
  mockEditItemFn,
  mockRemoveItemFn,
  mockItemsStoreSubscribeFn,
  mockFetchItemsFn,
  mockAddItemFn,
  mockFetchItemByIdFn,
  mockDispatchFn
} = vi.hoisted(() => {
  return {
    mockEditItemFn: vi.fn(),
    mockRemoveItemFn: vi.fn(),
    mockItemsStoreSubscribeFn: vi.fn(() => () => {}),
    mockFetchItemsFn: vi.fn(),
    mockAddItemFn: vi.fn(),
    mockFetchItemByIdFn: vi.fn(),
    mockDispatchFn: vi.fn()
  };
});

vi.mock('../../stores/items', () => ({
  itemsStore: {
    editItem: mockEditItemFn,
    removeItem: mockRemoveItemFn,
    subscribe: mockItemsStoreSubscribeFn,
    fetchItems: mockFetchItemsFn,
    addItem: mockAddItemFn,
    fetchItemById: mockFetchItemByIdFn,
  },
}));

vi.mock('svelte', async (importOriginal) => {
  const originalSvelte = await importOriginal<typeof import('svelte')>();
  return {
    ...originalSvelte,
    createEventDispatcher: () => mockDispatchFn,
  };
});

import ItemCard from './ItemCard.svelte';

const createMockItem = (overrides = {}) => ({
  id: 'item1',
  name: 'Test Item',
  location: 'A1',
  status: 'STORED',
  isPrivate: false,
  metadata: {
    category: 'Electronics',
    notes: 'Test notes for item',
  },
  lastUpdated: new Date(2023, 0, 15),
  ...overrides,
});

describe('ItemCard.svelte', () => {
  let item: ReturnType<typeof createMockItem>;

  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  beforeAll(() => {
    Date.prototype.toLocaleDateString = function(this: Date) {
      const month = this.getMonth() + 1;
      const day = this.getDate();
      const year = this.getFullYear();
      return `${month}/${day}/${year}`;
    };
  });

  afterAll(() => {
    Date.prototype.toLocaleDateString = originalToLocaleDateString;
  });

  beforeEach(() => {
    item = createMockItem();
    mockEditItemFn.mockReset().mockResolvedValue(undefined);
    mockRemoveItemFn.mockReset().mockResolvedValue(undefined);
    mockDispatchFn.mockReset();
    mockItemsStoreSubscribeFn.mockReset().mockReturnValue(() => {});
    mockFetchItemsFn.mockReset();
    mockAddItemFn.mockReset();
    mockFetchItemByIdFn.mockReset();
  });

  it('renders item details correctly', () => {
    render(ItemCard, { props: { item } });

    expect(screen.getByText(item.name)).toBeInTheDocument();
    expect(screen.getByText((_content, element) => element?.textContent === `Location: ${item.location}`)).toBeInTheDocument();
    expect(screen.getByText(item.status)).toBeInTheDocument();
    expect(screen.getByText((_content, element) => element?.textContent === `Category: ${item.metadata.category}`)).toBeInTheDocument();
    expect(screen.getByText((_content, element) => element?.textContent === `Notes: ${item.metadata.notes}`)).toBeInTheDocument();

    const expectedDateString = new Date(item.lastUpdated).toLocaleDateString();
    const lastUpdatedElement = screen.getByText('Last Updated:').closest('p');
    expect(lastUpdatedElement).toHaveTextContent(`Last Updated: ${expectedDateString}`);
  });

  it('shows Private badge if item is private', () => {
    item = createMockItem({ isPrivate: true });
    render(ItemCard, { props: { item } });
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('does not show Private badge if item is public', () => {
    item = createMockItem({ isPrivate: false });
    render(ItemCard, { props: { item } });
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
  });

  describe('Edit Modal', () => {
    it('opens edit modal with pre-filled data when Edit button is clicked', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Edit'));

      const dialog = screen.getByRole('dialog', { name: `Edit Item: ${item.name}` });
      expect(dialog).toBeInTheDocument();

      const nameInput = getByLabelText(dialog, 'Name*') as HTMLInputElement;
      const locationInput = getByLabelText(dialog, 'Location* (e.g., A1-D4)') as HTMLInputElement;
      const statusSelect = getByLabelText(dialog, 'Status') as HTMLSelectElement;
      const categoryInput = getByLabelText(dialog, 'Category') as HTMLInputElement;
      const notesTextarea = getByLabelText(dialog, 'Notes') as HTMLTextAreaElement;
      const privateCheckbox = getByLabelText(dialog, 'Private Item') as HTMLInputElement;

      expect(nameInput.value).toBe(item.name);
      expect(locationInput.value).toBe(item.location);
      expect(statusSelect.value).toBe(item.status);
      expect(categoryInput.value).toBe(item.metadata.category);
      expect(notesTextarea.value).toBe(item.metadata.notes);
      expect(privateCheckbox.checked).toBe(item.isPrivate);
    });

    it('calls itemsStore.editItem with updated data on save and closes modal', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Edit'));
      const dialog = screen.getByRole('dialog', { name: `Edit Item: ${item.name}` });
      const nameInput = getByLabelText(dialog, 'Name*');
      const locationInput = getByLabelText(dialog, 'Location* (e.g., A1-D4)');
      const formElement = dialog.querySelector('form');
      expect(formElement).toBeInTheDocument();

      await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
      await fireEvent.input(locationInput, { target: { value: 'B2' } });

      await fireEvent.submit(formElement!);

      expect(mockEditItemFn).toHaveBeenCalledWith(item.id, {
        name: 'Updated Name',
        location: 'B2',
        status: item.status,
        isPrivate: item.isPrivate,
        metadata: {
          category: item.metadata.category,
          notes: item.metadata.notes,
        },
      });
      expect(screen.queryByRole('dialog', { name: `Edit Item: ${item.name}` })).not.toBeInTheDocument();
    });

    it('shows error if editItem fails', async () => {
      const errorMessage = 'Simulated item update failure';
      mockEditItemFn.mockRejectedValueOnce(new Error(errorMessage));
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Edit'));
      const dialog = screen.getByRole('dialog', { name: `Edit Item: ${item.name}` });
      const formElement = dialog.querySelector('form');
      expect(formElement).toBeInTheDocument();

      const nameInput = getByLabelText(dialog, 'Name*') as HTMLInputElement;
      const locationInput = getByLabelText(dialog, 'Location* (e.g., A1-D4)') as HTMLInputElement;
      if (!nameInput.value) await fireEvent.input(nameInput, { target: { value: item.name } });
      if (!locationInput.value) await fireEvent.input(locationInput, { target: { value: item.location } });

      await fireEvent.submit(formElement!);

      expect(mockEditItemFn).toHaveBeenCalled();
      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: `Edit Item: ${item.name}` })).toBeInTheDocument();
    });

    it('shows validation error if name is missing', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Edit'));
      const dialog = screen.getByRole('dialog', { name: `Edit Item: ${item.name}` });
      const nameInput = getByLabelText(dialog, 'Name*');
      const form = dialog.querySelector('form');
      expect(form).not.toBeNull();

      await fireEvent.input(nameInput, { target: { value: '' } });
      await fireEvent.submit(form!);
      expect(screen.getByText('Name and Location are required.')).toBeInTheDocument();
      expect(mockEditItemFn).not.toHaveBeenCalled();
    });

    it('closes edit modal on Cancel click', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Edit'));
      const dialog = screen.getByRole('dialog', { name: `Edit Item: ${item.name}` });
      expect(dialog).toBeInTheDocument();

      const cancelButton = getByRole(dialog, 'button', { name: 'Cancel' });
      await fireEvent.click(cancelButton);
      expect(screen.queryByRole('dialog', { name: `Edit Item: ${item.name}` })).not.toBeInTheDocument();
    });
  });

  describe('Delete Modal', () => {
    it('opens delete confirmation modal when Delete button is clicked', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Delete'));
      const dialog = screen.getByRole('dialog', { name: 'Delete Item' });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)).toBeInTheDocument();
    });

    it('calls itemsStore.removeItem and dispatches event on confirm delete', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Delete'));
      const dialog = screen.getByRole('dialog', { name: 'Delete Item' });
      const confirmButton = getByRole(dialog, 'button', { name: 'Delete' });
      await fireEvent.click(confirmButton);

      expect(mockRemoveItemFn).toHaveBeenCalledWith(item.id);
      expect(mockDispatchFn).toHaveBeenCalledWith('itemdeleted', { id: item.id });
      expect(screen.queryByRole('dialog', { name: 'Delete Item' })).not.toBeInTheDocument();
    });

    it('shows error if removeItem fails', async () => {
      const errorMessage = 'Simulated item deletion failure';
      mockRemoveItemFn.mockRejectedValueOnce(new Error(errorMessage));
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Delete'));
      const dialog = screen.getByRole('dialog', { name: 'Delete Item' });
      const confirmButton = getByRole(dialog, 'button', { name: 'Delete' });
      await fireEvent.click(confirmButton);

      expect(mockRemoveItemFn).toHaveBeenCalled();
      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Delete Item' })).toBeInTheDocument();
    });

    it('closes delete modal on Cancel click', async () => {
      render(ItemCard, { props: { item } });
      await fireEvent.click(screen.getByText('Delete'));
      const dialog = screen.getByRole('dialog', { name: 'Delete Item' });
      expect(dialog).toBeInTheDocument();

      const cancelButton = getByRole(dialog, 'button', { name: 'Cancel' });
      await fireEvent.click(cancelButton);

      expect(screen.queryByRole('dialog', { name: 'Delete Item' })).not.toBeInTheDocument();
    });
  });

  it('formats Firestore timestamp object correctly', () => {
    const itemWithTimestampObject = createMockItem({
      lastUpdated: { toDate: () => new Date(2023, 1, 20) }
    });
    render(ItemCard, { props: { item: itemWithTimestampObject } });
    const expectedDateString = new Date(2023, 1, 20).toLocaleDateString();
    const lastUpdatedElement = screen.getByText('Last Updated:').closest('p');
    expect(lastUpdatedElement).toHaveTextContent(`Last Updated: ${expectedDateString}`);
  });

  it('formats date string correctly', () => {
    const itemWithDateString = createMockItem({
      lastUpdated: '2023-03-25T10:00:00.000Z'
    });
    render(ItemCard, { props: { item: itemWithDateString } });
    const expectedDateString = new Date('2023-03-25T10:00:00.000Z').toLocaleDateString();
    const lastUpdatedElement = screen.getByText('Last Updated:').closest('p');
    expect(lastUpdatedElement).toHaveTextContent(`Last Updated: ${expectedDateString}`);
  });

  it('shows N/A for undefined date', () => {
    const itemWithUndefinedDate = createMockItem({ lastUpdated: undefined });
    render(ItemCard, { props: { item: itemWithUndefinedDate } });
    const lastUpdatedElement = screen.getByText('Last Updated:').closest('p');
    expect(lastUpdatedElement).toHaveTextContent('Last Updated: N/A');
  });

  it('shows Invalid Date for unparseable date type', () => {
    const itemWithInvalidDate = createMockItem({ lastUpdated: 12345 }); // Pass a number
    render(ItemCard, { props: { item: itemWithInvalidDate } });
    const lastUpdatedElement = screen.getByText('Last Updated:').closest('p');
    expect(lastUpdatedElement).toHaveTextContent('Last Updated: Invalid Date');
  });

});