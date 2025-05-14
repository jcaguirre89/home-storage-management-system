<script lang="ts">
  import { user } from '../../stores/auth';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';

  type AppUser = {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    householdId: string | null;
  };

  type UserStoreState = {
    user: AppUser | null;
    profile: Record<string, any> | null;
    loading: boolean;
    error: Error | null;
  };

  let email = '';
  let password = '';
  let displayName = '';
  let errorMessage = '';
  let isLoading = false;

  const handleSignUp = async () => {
    isLoading = true;
    errorMessage = '';
    try {
      const signedUpFirebaseUser = await user.signUp(email, password, displayName);

      if (!signedUpFirebaseUser) {
        setTimeout(() => {
          const currentStoreState = get(user) as UserStoreState;
          if (currentStoreState.error) {
            errorMessage = currentStoreState.error.message || 'Sign up failed. Please check details.';
          } else if (!currentStoreState.user) {
            errorMessage = 'Sign up process did not complete. Please try again.';
          }
          isLoading = false;
        }, 100);
      }

    } catch (error: any) {
      errorMessage = error.message || 'An unexpected error occurred during sign up.';
      isLoading = false;
    }
  };

  user.subscribe((value: UserStoreState) => {
    if (value.loading) return;

    if (value.user) {
      if (value.user.householdId) {
        goto('/dashboard');
      } else {
        goto('/household/setup');
      }
      isLoading = false;
    } else if (value.error) {
        errorMessage = value.error.message || "Signup or login failed.";
        isLoading = false;
    }
  });

</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Create your account
      </h2>
    </div>
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleSignUp}>
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="displayName" class="sr-only">Display Name</label>
          <input id="displayName" name="displayName" type="text" bind:value={displayName} required
                 class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                 placeholder="Display Name">
        </div>
        <div>
          <label for="email-address" class="sr-only">Email address</label>
          <input id="email-address" name="email" type="email" bind:value={email} required
                 class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                 placeholder="Email address">
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input id="password" name="password" type="password" bind:value={password} required
                 class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                 placeholder="Password (min. 6 characters)">
        </div>
      </div>

      {#if errorMessage}
        <p class="mt-2 text-center text-sm text-red-600">
          {errorMessage}
        </p>
      {/if}

      <div>
        <button type="submit" disabled={isLoading}
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating account...
          {:else}
            Sign up
          {/if}
        </button>
      </div>
    </form>
    <p class="mt-2 text-center text-sm text-gray-600">
      Already have an account?
      <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
        Sign in
      </a>
    </p>
  </div>
</div>