<script>
  import { user } from '../../stores/auth';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false;

  const handleLogin = async () => {
    isLoading = true;
    errorMessage = '';
    try {
      const loggedInUser = await user.signIn(email, password);
      if (loggedInUser) {
        goto('/dashboard'); // Redirect to dashboard on successful login
      } else {
        // Error is set in the store, but we can also set a local message
        // Wait for store to update
        setTimeout(() => {
          const storeError = $user.error;
          if (storeError) {
            errorMessage = storeError.message || 'Login failed. Please check your credentials.';
          } else {
            errorMessage = 'Login failed. Please check your credentials.';
          }
          isLoading = false;
        }, 100);
      }
    } catch (error) {
      // This catch might be redundant if store handles all errors
      errorMessage = error.message || 'An unexpected error occurred.';
      isLoading = false;
    }
  };

  // If user is already logged in, redirect to dashboard
  user.subscribe(value => {
    if (value.user) {
      goto('/dashboard');
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
    </div>
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="email-address" class="sr-only">Email address</label>
          <input id="email-address" name="email" type="email" bind:value={email} required
                 class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                 placeholder="Email address">
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input id="password" name="password" type="password" bind:value={password} required
                 class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                 placeholder="Password">
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
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>
      </div>
    </form>
    <p class="mt-2 text-center text-sm text-gray-600">
      Don't have an account?
      <a href="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
        Sign up
      </a>
    </p>
  </div>
</div>