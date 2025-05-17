<script lang="ts">
  import { onMount } from 'svelte';
  // import type { Writable } from 'svelte/store'; // Writable type might not be needed if not directly used.
  import { itemsStore } from '../../../stores/items'; // Keep store import
  import { user } from '../../../stores/auth';   // Keep store import
  import ItemCard from '../../../components/Items/ItemCard.svelte';
  import SearchBar from '../../../components/Layout/SearchBar.svelte';

  // --- Locally Defined Types --- START ---
  // (These were confirmed to be correct and necessary in previous steps as stores don't export them)
  type AppUser = {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    householdId: string | null;
  };

  type UserStoreData = {
    user: AppUser | null;
    profile: Record<string, any> | null;
    loading: boolean;
    error: Error | null;
  };

  type ItemMetadata = {
    category?: string;
    notes?: string;
    [key: string]: any;
  };

  type Item = {
    id: string;
    name: string;
    location: string;
    status: 'STORED' | 'OUT';
    isPrivate: boolean;
    creatorUserId: string; // Added based on common requirements
    householdId: string;   // Added based on common requirements
    lastUpdated?: any;
    metadata?: ItemMetadata;
  };

  type ItemStoreData = {
    items: Item[];
    loading: boolean;
    error: Error | null;
  };
  // --- Locally Defined Types --- END ---

  let currentUser = $derived(($user as UserStoreData).user);
  let searchTerm = $state('');
  let showCreateModal = $state(false);

  let newItemName = $state('');
  let newItemLocation = $state('');
  let newItemCategory = $state('');
  let newItemNotes = $state('');
  let newItemStatus = $state('STORED' as 'STORED' | 'OUT');
  let newItemIsPrivate = $state(false);

  let createFormError = $state('');
  let createFormLoading = $state(false);

  onMount(() => {
    itemsStore.fetchItems();
  });

  function openCreateModal() {
    newItemName = '';
    newItemLocation = '';
    newItemCategory = '';
    newItemNotes = '';
    newItemStatus = 'STORED';
    newItemIsPrivate = false;
    createFormError = '';
    showCreateModal = true;
  }

  async function handleCreateItem(event: Event) {
    event.preventDefault();
    if (!newItemName.trim() || !newItemLocation.trim()) {
      createFormError = 'Name and Location are required.';
      return;
    }
    if (!currentUser?.uid || !currentUser?.householdId) {
        createFormError = 'User information is missing. Cannot create item.';
        return;
    }

    createFormLoading = true;
    createFormError = '';
    try {
      // For Item type, ensure all required fields by the type definition are considered
      // The actual creation payload might differ if backend sets some fields (creatorUserId, householdId)
      const itemDataToCreate = {
        name: newItemName.trim(),
        location: newItemLocation.trim().toUpperCase(),
        status: newItemStatus,
        isPrivate: newItemIsPrivate,
        metadata: {
          category: newItemCategory.trim(),
          notes: newItemNotes.trim(),
        },
        // creatorUserId: currentUser.uid, // Usually set by backend based on authenticated user
        // householdId: currentUser.householdId, // Usually set by backend
      };
      await itemsStore.addItem(itemDataToCreate);
      closeCreateModal();
    } catch (err: unknown) {
      console.error("Error creating item:", err);
      if (err instanceof Error) {
        createFormError = err.message;
      } else {
        createFormError = 'An unknown error occurred. Please try again.';
      }
    } finally {
      createFormLoading = false;
    }
  }

  function closeCreateModal() {
    showCreateModal = false;
  }

  $effect(() => {
    if (!showCreateModal) {
      createFormError = '';
    }
  });

  let filteredItems = $derived((($items): Item[] => {
    if (!searchTerm.trim()) {
      return ($items as ItemStoreData).items;
    }
    return ($items as ItemStoreData).items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.metadata?.category && item.metadata.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  })($itemsStore));

  function handleItemDeleted(event: CustomEvent<{ id: string }>) {
    console.log(`Item with id ${event.detail.id} was deleted, list should update via store.`);
  }

</script>

<svelte:head>
  <title>My Items</title>
</svelte:head>

<div class="space-y-6">
  <div class="md:flex md:items-center md:justify-between">
    <h1 class="text-3xl font-bold text-gray-800">My Items</h1>
    <button
      onclick={openCreateModal}
      class="mt-4 md:mt-0 w-full md:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
      Add New Item
    </button>
  </div>

  <SearchBar bind:searchTerm={searchTerm} />

  {#if ($itemsStore as ItemStoreData).loading}
    <p class="text-center text-gray-500 py-10">Loading items...</p>
  {:else if ($itemsStore as ItemStoreData).error}
    <p class="text-center text-red-500 py-10">Error loading items: {($itemsStore as ItemStoreData).error?.message}</p>
  {:else if filteredItems.length === 0}
    <div class="text-center py-10">
      <p class="text-xl text-gray-500 mb-4">
        {#if searchTerm.trim()}No items match "{searchTerm}".{:else}You don't have any items yet.{/if}
      </p>
      {#if !searchTerm.trim()}
        <button
          onclick={openCreateModal}
          type="button"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Add Your First Item
        </button>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredItems as item (item.id)}
        <ItemCard {item} on:itemdeleted={handleItemDeleted} />
      {/each}
    </div>
  {/if}
</div>

<!-- Create Item Modal -->
{#if showCreateModal}
  <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onclick={closeCreateModal}></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <form id="create-item-form" onsubmit={handleCreateItem} class="p-6 space-y-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Add New Item</h3>
          <div>
            <label for="newItemName" class="block text-sm font-medium text-gray-700">Name*</label>
            <input type="text" id="newItemName" bind:value={newItemName} required class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label for="newItemLocation" class="block text-sm font-medium text-gray-700">Location* (e.g., A1-D4)</label>
            <input type="text" id="newItemLocation" bind:value={newItemLocation} required pattern="[A-Da-d][1-4]" title="Enter a location like A1, B3, etc." class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label for="newItemStatus" class="block text-sm font-medium text-gray-700">Status</label>
            <select id="newItemStatus" bind:value={newItemStatus} class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">
              <option value="STORED">STORED</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div>
            <label for="newItemCategory" class="block text-sm font-medium text-gray-700">Category</label>
            <input type="text" id="newItemCategory" bind:value={newItemCategory} class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label for="newItemNotes" class="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="newItemNotes" rows="3" bind:value={newItemNotes} class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
          </div>
          <div class="flex items-center">
            <input id="newItemIsPrivate" type="checkbox" bind:checked={newItemIsPrivate} class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
            <label for="newItemIsPrivate" class="ml-2 block text-sm text-gray-900">Private Item</label>
          </div>

          {#if createFormError}
            <p class="text-sm text-red-600">{createFormError}</p>
          {/if}

          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse -mx-6 -mb-6 mt-6 rounded-b-lg">
            <button type="submit" disabled={createFormLoading} class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
              {#if createFormLoading}Creating...{:else}Create Item{/if}
            </button>
            <button type="button" onclick={closeCreateModal} class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Add any specific styles for this page here */
</style>