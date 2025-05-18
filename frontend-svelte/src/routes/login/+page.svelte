<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '../../stores/auth'; // Adjust path as necessary
  import { onMount } from 'svelte';

  // Define type for the user store's value (consistent with other files)
  type AppUser = {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    householdId: string | null;
  };
  type UserStoreValue = {
    user: AppUser | null;
    loading: boolean;
    error: Error | null;
    profile: Record<string, any> | null;
  };

  let email = $state('');
  let password = $state('');
  let isLoading = $state(false);
  let errorMessage = $state('');

  // Redirect if user is already logged in
  onMount(() => {
    const unsubscribe = user.subscribe((value: UserStoreValue) => {
      if (!value.loading && value.user) {
        goto('/dashboard'); // Or wherever you redirect logged-in users
        if (unsubscribe) unsubscribe(); // Unsubscribe after redirecting
      }
    });
    // Ensure to unsubscribe on component destroy if not redirected immediately
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      errorMessage = 'Email and password cannot be empty.';
      return;
    }
    isLoading = true;
    errorMessage = '';
    try {
      const loggedInUser = await user.signIn(email, password);
      if (loggedInUser) {
        // onAuthStateChanged in the store will trigger redirect via the onMount subscription
        // or user will be picked up by layout guards.
        // goto('/dashboard'); // Not strictly needed here if onMount handles it
      } else {
        // Error should be set by the store, but set a generic one if not.
        const storeError = ($user as UserStoreValue).error;
        errorMessage = storeError?.message || 'Login failed. Please check your credentials.';
      }
    } catch (err: any) { // Catch any error from signIn itself if it throws string/non-Error
      console.error("Login page catch:", err);
      errorMessage = err.message || 'An unexpected error occurred during login.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Home Storage</title>
</svelte:head>

<div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
      <form class="space-y-6" onsubmit={handleSubmit}>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700"> Email address </label>
          <div class="mt-1">
            <input id="email" name="email" type="email" autocomplete="email" required bind:value={email} disabled={isLoading}
                   class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700"> Password </label>
          <div class="mt-1">
            <input id="password" name="password" type="password" autocomplete="current-password" required bind:value={password} disabled={isLoading}
                   class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        {#if errorMessage}
          <p class="text-sm text-red-600 text-center">{errorMessage}</p>
        {/if}

        <div class="flex items-center justify-between">
          <div class="text-sm">
            <a href="/register" class="font-medium text-indigo-600 hover:text-indigo-500"> Don't have an account? Sign up. </a>
          </div>
        </div>

        <div>
          <button type="submit" disabled={isLoading}
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {#if isLoading}Signing In...{:else}Sign In{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>