<script>
  import { onMount } from 'svelte';
  import { itemsStore } from '../../../stores/items'; // Adjusted path
  import { user } from '../../../stores/auth'; // For creatorUserId and householdId context if needed
  import ItemCard from '../../../components/Items/ItemCard.svelte'; // Adjusted path
  import SearchBar from '../../../components/Layout/SearchBar.svelte'; // Adjusted path for a generic search bar

  let searchTerm = '';
  let showCreateModal = false;

  onMount(() => {
    itemsStore.fetchItems();
  });

  $: filteredItems = $itemsStore.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.metadata?.category && item.metadata.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // For ItemForm modal - will be part of Item Creation step
  let newItemName = '';
  let newItemLocation = '';
  let newItemStatus = 'STORED';
  let newItemIsPrivate = false;
  let newItemCategory = '';
  let newItemNotes = '';
  let itemFormError = '';
  let itemFormLoading = false;

  const openCreateModal = () => {
    newItemName = '';
    newItemLocation = '';
    newItemStatus = 'STORED';
    newItemIsPrivate = false;
    newItemCategory = '';
    newItemNotes = '';
    itemFormError = '';
    showCreateModal = true;
  };

  const handleCreateItem = async () => {
    itemFormLoading = true;
    itemFormError = '';
    if (!newItemName || !newItemLocation) {
      itemFormError = 'Name and Location are required.';
      itemFormLoading = false;
      return;
    }
    try {
      await itemsStore.addItem({
        name: newItemName,
        location: newItemLocation,
        status: newItemStatus,
        isPrivate: newItemIsPrivate,
        metadata: {
          category: newItemCategory,
          notes: newItemNotes,
        }
      });
      showCreateModal = false;
    } catch (err) {
      itemFormError = err.message || "Failed to create item.";
    } finally {
      itemFormLoading = false;
    }
  };

</script>

<div class="space-y-6">
  <div class="md:flex md:items-center md:justify-between">
    <h1 class="text-3xl font-bold text-gray-800">My Items</h1>
    <button
      on:click={openCreateModal}
      class="mt-4 md:mt-0 w-full md:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
      Add New Item
    </button>
  </div>

  <SearchBar bind:searchTerm placeholder="Search items by name, category, location..." />

  {#if $itemsStore.loading}
    <p class="text-center text-gray-500 py-8">Loading items...</p>
  {:else if $itemsStore.error}
    <p class="text-center text-red-500 py-8">Error loading items: {$itemsStore.error.message}</p>
  {:else if filteredItems.length === 0}
    <div class="text-center py-10 px-6 bg-white shadow-md rounded-lg">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No items found</h3>
        <p class="mt-1 text-sm text-gray-500">
            {#if searchTerm}
                Try adjusting your search or
            {/if}
            get started by adding a new item.
        </p>
        <div class="mt-6">
            <button
              on:click={openCreateModal}
              type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Add New Item
            </button>
        </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredItems as item (item.id)}
        <ItemCard {item} />
      {/each}
    </div>
  {/if}
</div>

<!-- Create Item Modal -->
{#if showCreateModal}
<div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
  <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
      <form on:submit|preventDefault={handleCreateItem} class="p-6 space-y-4">
        <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Add New Item</h3>
        <div>
          <label for="itemName" class="block text-sm font-medium text-gray-700">Name*</label>
          <input type="text" id="itemName" bind:value={newItemName} required class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="itemLocation" class="block text-sm font-medium text-gray-700">Location* (e.g., A1-D4)</label>
          <input type="text" id="itemLocation" bind:value={newItemLocation} required pattern="[A-Da-d][1-4]" title="Enter a location like A1, B3, etc." class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="itemStatus" class="block text-sm font-medium text-gray-700">Status</label>
          <select id="itemStatus" bind:value={newItemStatus} class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">
            <option value="STORED">STORED</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        <div>
          <label for="itemCategory" class="block text-sm font-medium text-gray-700">Category</label>
          <input type="text" id="itemCategory" bind:value={newItemCategory} class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="itemNotes" class="block text-sm font-medium text-gray-700">Notes</label>
          <textarea id="itemNotes" rows="3" bind:value={newItemNotes} class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
        </div>
        <div class="flex items-center">
          <input id="itemIsPrivate" type="checkbox" bind:checked={newItemIsPrivate} class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
          <label for="itemIsPrivate" class="ml-2 block text-sm text-gray-900">Private Item (only visible to you)</label>
        </div>

        {#if itemFormError}
          <p class="text-sm text-red-600">{itemFormError}</p>
        {/if}

        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button type="submit" disabled={itemFormLoading} class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
            {#if itemFormLoading}Saving...{:else}Save Item{/if}
          </button>
          <button type="button" on:click={() => showCreateModal = false} class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
{/if}