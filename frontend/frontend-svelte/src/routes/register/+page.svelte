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
  let displayName = $state('');
  let isLoading = $state(false);
  let errorMessage = $state('');

  // Redirect if user is already logged in
  onMount(() => {
    const unsubscribe = user.subscribe((value: UserStoreValue) => {
      if (!value.loading && value.user) {
        goto('/dashboard'); // Or wherever you redirect logged-in users
        if (unsubscribe) unsubscribe();
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      errorMessage = 'All fields are required.';
      return;
    }
    if (password.length < 6) {
      errorMessage = 'Password must be at least 6 characters long.';
      return;
    }
    isLoading = true;
    errorMessage = '';
    try {
      const registeredUser = await user.signUp(email, password, displayName);
      if (registeredUser) {
        // user.signIn in the store will trigger onAuthStateChanged, which then
        // leads to redirect via onMount subscription or layout guards.
        // goto('/dashboard'); // Not strictly needed if onMount handles it
      } else {
        const storeError = ($user as UserStoreValue).error;
        errorMessage = storeError?.message || 'Registration failed. Please try again.';
      }
    } catch (err: any) {
      console.error("Register page catch:", err);
      errorMessage = err.message || 'An unexpected error occurred during registration.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Register - Home Storage</title>
</svelte:head>

<div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
      <form class="space-y-6" onsubmit={handleSubmit}>
        <div>
          <label for="displayName" class="block text-sm font-medium text-gray-700"> Display Name </label>
          <div class="mt-1">
            <input id="displayName" name="displayName" type="text" required bind:value={displayName} disabled={isLoading}
                   class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

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
            <input id="password" name="password" type="password" autocomplete="new-password" required bind:value={password} disabled={isLoading}
                   class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        {#if errorMessage}
          <p class="text-sm text-red-600 text-center">{errorMessage}</p>
        {/if}

        <div class="text-sm text-center">
          <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500"> Already have an account? Sign in. </a>
        </div>

        <div>
          <button type="submit" disabled={isLoading}
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {#if isLoading}Creating Account...{:else}Create Account{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>