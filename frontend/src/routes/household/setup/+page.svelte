<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '../../../stores/auth'; // Import user store
  import { householdStore } from '../../../stores/household';
  import { createHousehold } from '../../../services/api';

  // Define a simple user type for better type checking
  type AppUser = {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    householdId: string | null;
    // Add other fields from your Firestore user profile as needed
  };

  type UserStoreData = {
    user: AppUser | null;
    profile: Record<string, any> | null; // Or a more specific profile type
    loading: boolean;
    error: Error | null;
  };

  // Define a simple type for the household store's data structure
  type HouseholdStoreData = {
    id: string | null;
    name: string;
    ownerUserId: string;
    memberUserIds: string[];
    loading: boolean;
    error: Error | null; // Explicitly type error as Error | null
    // Add other fields as defined in your householdStore initialHouseholdState
  };

  let householdName = '';
  let isLoading = false;
  let errorMessage = '';

  // Explicitly type $user based on the store structure
  let currentUserData: UserStoreData;
  user.subscribe(($userStoreVal) => {
    currentUserData = $userStoreVal as UserStoreData; // Cast to defined type
    if (currentUserData && !currentUserData.loading && currentUserData.user && currentUserData.user.householdId) {
      goto('/dashboard');
    } else if (currentUserData && !currentUserData.loading && !currentUserData.user) {
      goto('/login');
    }
  });

  // Explicitly type $householdStore for template access
  let currentHouseholdData: HouseholdStoreData;
  householdStore.subscribe(($householdStoreVal) => {
    currentHouseholdData = $householdStoreVal as HouseholdStoreData;
  });

  async function handleCreateHousehold() {
    if (!householdName.trim()) {
      errorMessage = 'Household name cannot be empty.';
      return;
    }
    isLoading = true;
    errorMessage = '';

    try {
      const newHousehold = await createHousehold({ name: householdName.trim() });
      console.log("Household created successfully:", newHousehold);

      // Call refreshUserProfile as a method of the user store instance
      await user.refreshUserProfile();

    } catch (err) {
      console.error('Error creating household:', err);
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = 'An unknown error occurred. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Setup Your Household</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-md">
  <h1 class="text-2xl font-bold mb-6 text-center">Create Your Household</h1>

  {#if currentUserData?.loading}
    <p class="text-center">Loading user information...</p>
  {:else if !currentUserData?.user}
    <p class="text-center">You need to be logged in to create a household.</p>
  {:else if currentUserData.user.householdId}
    <p class="text-center">You are already part of a household. Redirecting...</p>
  {:else}
    <p class="mb-4 text-gray-700">
      Welcome! To get started, please create a household. This will allow you to manage your stored items.
    </p>
    <form on:submit|preventDefault={handleCreateHousehold} class="space-y-4">
      <div>
        <label for="householdName" class="block text-sm font-medium text-gray-700">Household Name:</label>
        <input
          type="text"
          id="householdName"
          bind:value={householdName}
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="E.g., The Smith Family Home"
          required
          disabled={isLoading}
        />
      </div>

      {#if errorMessage}
        <p class="text-red-500 text-sm">{errorMessage}</p>
      {/if}

      <div>
        <button
          type="submit"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={isLoading}
        >
          {#if isLoading}
            Creating...
          {:else}
            Create Household
          {/if}
        </button>
      </div>
    </form>
  {/if}

  {#if currentHouseholdData?.loading && currentUserData?.user && currentUserData.user.householdId && !currentUserData?.loading}
    <p class="text-center mt-4">Loading household details...</p>
  {/if}
  {#if currentHouseholdData?.error}
    <p class="text-red-500 text-sm mt-4 text-center">Error loading household: {currentHouseholdData.error.message}</p>
  {/if}
</div>

<style>
  /* Basic styling, assuming Tailwind is globally available */
</style>