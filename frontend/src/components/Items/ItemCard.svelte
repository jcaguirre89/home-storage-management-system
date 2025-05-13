<script>
  export let item;
  import { itemsStore } from '../../stores/items'; // Adjusted path
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let showEditModal = false;
  let showDeleteConfirm = false;

  // Form fields for editing
  let editName = item.name;
  let editLocation = item.location;
  let editStatus = item.status;
  let editIsPrivate = item.isPrivate;
  let editCategory = item.metadata?.category || '';
  let editNotes = item.metadata?.notes || '';
  let editFormError = '';
  let editFormLoading = false;
  let deleteLoading = false;

  const openEditModal = () => {
    editName = item.name;
    editLocation = item.location;
    editStatus = item.status;
    editIsPrivate = item.isPrivate;
    editCategory = item.metadata?.category || '';
    editNotes = item.metadata?.notes || '';
    editFormError = '';
    showEditModal = true;
  };

  const handleEditItem = async () => {
    editFormLoading = true;
    editFormError = '';
    if (!editName || !editLocation) {
      editFormError = 'Name and Location are required.';
      editFormLoading = false;
      return;
    }
    try {
      await itemsStore.editItem(item.id, {
        name: editName,
        location: editLocation,
        status: editStatus,
        isPrivate: editIsPrivate,
        metadata: {
          category: editCategory,
          notes: editNotes,
        }
      });
      showEditModal = false;
    } catch (err) {
      editFormError = err.message || "Failed to update item.";
    } finally {
      editFormLoading = false;
    }
  };

  const handleDeleteItem = async () => {
    deleteLoading = true;
    try {
      await itemsStore.removeItem(item.id);
      showDeleteConfirm = false; // Close confirmation on success
      // The store will update and reactivity will remove the card
    } catch (err) {
      console.error("Error deleting item from card:", err);
      // Optionally show an error message to the user on the card or modal
      alert(`Failed to delete item: ${err.message}`);
    } finally {
      deleteLoading = false;
    }
  };

  // Helper to format timestamp if it exists
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Firestore Timestamps might be objects or ISO strings depending on how they are fetched/processed
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString(); // Firebase Timestamp object
    if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString();
    return 'Invalid Date';
  };
</script>

<div class="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col">
  <div class="p-5 flex-grow">
    <div class="flex justify-between items-start mb-2">
        <h3 class="text-xl font-semibold text-gray-800 group-hover:text-indigo-600">{item.name}</h3>
        {#if item.isPrivate}
            <span class="px-2 py-0.5 text-xs font-semibold text-purple-800 bg-purple-200 rounded-full">Private</span>
        {/if}
    </div>
    <p class="text-sm text-gray-600 mb-1">
      <span class="font-medium">Location:</span> {item.location}
    </p>
    <p class="text-sm text-gray-600 mb-1">
      <span class="font-medium">Status:</span>
      <span class:text-green-600={item.status === 'STORED'} class:text-yellow-600={item.status === 'OUT'}>
        {item.status}
      </span>
    </p>
    {#if item.metadata?.category}
      <p class="text-sm text-gray-500 mb-1"><span class="font-medium">Category:</span> {item.metadata.category}</p>
    {/if}
    {#if item.metadata?.notes}
      <p class="text-sm text-gray-500 mb-3 leading-relaxed"><span class="font-medium">Notes:</span> {item.metadata.notes}</p>
    {/if}
    <p class="text-xs text-gray-400"><span class="font-medium">Last Updated:</span> {formatDate(item.lastUpdated)}</p>
  </div>
  <div class="bg-gray-50 p-4 flex justify-end space-x-2">
    <button on:click={openEditModal} class="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Edit</button>
    <button on:click={() => showDeleteConfirm = true} class="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">Delete</button>
  </div>
</div>

<!-- Edit Item Modal -->
{#if showEditModal}
<div class="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title-edit-{item.id}" role="dialog" aria-modal="true">
  <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" on:click={() => showEditModal = false}></div>
    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
      <form on:submit|preventDefault={handleEditItem} class="p-6 space-y-4">
        <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title-edit-{item.id}">Edit Item: {item.name}</h3>
        <div>
          <label for="editItemName-{item.id}" class="block text-sm font-medium text-gray-700">Name*</label>
          <input type="text" id="editItemName-{item.id}" bind:value={editName} required class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="editItemLocation-{item.id}" class="block text-sm font-medium text-gray-700">Location* (e.g., A1-D4)</label>
          <input type="text" id="editItemLocation-{item.id}" bind:value={editLocation} required pattern="[A-Da-d][1-4]" title="Enter a location like A1, B3, etc." class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="editItemStatus-{item.id}" class="block text-sm font-medium text-gray-700">Status</label>
          <select id="editItemStatus-{item.id}" bind:value={editStatus} class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">
            <option value="STORED">STORED</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        <div>
          <label for="editItemCategory-{item.id}" class="block text-sm font-medium text-gray-700">Category</label>
          <input type="text" id="editItemCategory-{item.id}" bind:value={editCategory} class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="editItemNotes-{item.id}" class="block text-sm font-medium text-gray-700">Notes</label>
          <textarea id="editItemNotes-{item.id}" rows="3" bind:value={editNotes} class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
        </div>
        <div class="flex items-center">
          <input id="editItemIsPrivate-{item.id}" type="checkbox" bind:checked={editIsPrivate} class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
          <label for="editItemIsPrivate-{item.id}" class="ml-2 block text-sm text-gray-900">Private Item</label>
        </div>

        {#if editFormError}
          <p class="text-sm text-red-600">{editFormError}</p>
        {/if}

        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button type="submit" disabled={editFormLoading} class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
            {#if editFormLoading}Saving...{:else}Save Changes{/if}
          </button>
          <button type="button" on:click={() => showEditModal = false} class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
<div class="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title-delete-{item.id}" role="dialog" aria-modal="true">
  <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" on:click={() => showDeleteConfirm = false}></div>
    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
      <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <!-- Heroicon name: outline/exclamation -->
            <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title-delete-{item.id}">
              Delete Item
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Are you sure you want to delete "{item.name}"? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
      {#if editFormError} <!-- Reusing for delete error for now -->
        <p class="px-6 text-sm text-red-600">{editFormError}</p>
      {/if}
      <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button on:click={handleDeleteItem} disabled={deleteLoading} type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
          {#if deleteLoading}Deleting...{:else}Delete{/if}
        </button>
        <button on:click={() => showDeleteConfirm = false} type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>
{/if}