<script lang="ts">
  import { user } from '../../stores/auth'; // Path to auth store
  import { goto } from '$app/navigation';
  import { page } from '$app/stores'; // To get current path for active link styling

  async function handleSignOut() {
    await user.signOut();
    goto('/login');
  }

  // Define a simple user type for $user.user
  type AppUser = {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    householdId: string | null;
  };

  // Define type for the user store's value
  type UserStoreValue = {
    user: AppUser | null;
    loading: boolean;
    error: Error | null;
    profile: Record<string, any> | null;
  };

</script>

<header class="bg-white shadow-md">
  <nav class="container mx-auto px-6 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <a href="/dashboard" class="text-xl font-semibold text-gray-700 hover:text-indigo-500">
          Home Storage
        </a>
        <!-- Navigation Links for logged-in users -->
        {#if ($user as UserStoreValue).user}
          <div class="hidden md:flex md:items-center md:ml-10 space-x-4">
            <a
              href="/dashboard"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors duration-150"
              class:text-indigo-600={$page.url.pathname === '/dashboard'}
              class:text-gray-700={$page.url.pathname !== '/dashboard'}
            >
              Dashboard
            </a>
            <a
              href="/items"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors duration-150"
              class:text-indigo-600={$page.url.pathname.startsWith('/items')}
              class:text-gray-700={!$page.url.pathname.startsWith('/items')}
            >
              My Items
            </a>
            <a
              href="/household"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors duration-150"
              class:text-indigo-600={$page.url.pathname.startsWith('/household')}
              class:text-gray-700={!$page.url.pathname.startsWith('/household')}
            >
              Manage Household
            </a>
            <!-- Add other main navigation links here -->
          </div>
        {/if}
      </div>

      <div class="flex items-center">
        {#if ($user as UserStoreValue).user}
          <span class="text-gray-700 text-sm mr-4 hidden sm:inline">
            Welcome, {($user as UserStoreValue).user?.displayName || ($user as UserStoreValue).user?.email}
          </span>
          <button
            on:click={handleSignOut}
            class="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            Sign Out
          </button>
        {:else if !$page.url.pathname.startsWith('/login') && !$page.url.pathname.startsWith('/register')}
          <!-- Show login/register if not on those pages and not logged in -->
          <a href="/login" class="text-gray-700 hover:text-indigo-500 text-sm font-medium mr-4">Sign In</a>
          <a href="/register" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors duration-150">Sign Up</a>
        {/if}
      </div>
    </div>

    <!-- Mobile Menu (optional, for future enhancement) -->
    {#if ($user as UserStoreValue).user}
      <div class="md:hidden flex flex-col mt-3 space-y-1">
        <a href="/dashboard" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-indigo-600">Dashboard</a>
        <a href="/items" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-indigo-600">My Items</a>
        <a href="/household" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-indigo-600">Manage Household</a>
      </div>
    {/if}
  </nav>
</header>