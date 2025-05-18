<script>
  import { user } from '../stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    /**
	   * @type {import("svelte/store").Unsubscriber}
	   */
    let unsubscribe;
    unsubscribe = user.subscribe(authStore => {
      if (!authStore.loading) {
        if (authStore.user) {
          goto('/dashboard');
        } else {
          goto('/login');
        }
        // Now unsubscribe is fully initialized when we call it
        unsubscribe();
      }
    });
  });
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gray-100">
  <div class="p-8 bg-white shadow-lg rounded-xl text-center">
    <h1 class="text-3xl font-bold text-indigo-600 mb-4">Home Storage System</h1>
    <p class="text-gray-700">Loading and redirecting...</p>
    <div class="mt-6">
      <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  </div>
</div>