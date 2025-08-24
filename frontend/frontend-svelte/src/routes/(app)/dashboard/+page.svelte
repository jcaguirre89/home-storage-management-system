<script lang="ts">
  import { user } from '../../../stores/auth'; // Adjusted path due to (app) group
  import { goto } from '$app/navigation';

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

  const handleSignOut = async () => {
    await user.signOut();
    goto('/login'); // Redirect to login after sign out
  };
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold text-gray-800">Dashboard</h1>
    <button
      onclick={handleSignOut}
      class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-150 ease-in-out">
      Sign Out
    </button>
  </div>

  <div class="bg-white shadow-md rounded-lg p-6">
    <p class="text-gray-700">
      Welcome to your dashboard, {($user as UserStoreValue).user?.displayName || ($user as UserStoreValue).user?.email}!
    </p>
    <p class="mt-4 text-gray-600">
      This is where you'll see your storage grid and manage your items.
    </p>
    <p class="mt-2 text-gray-600">
      Item list and other features will be implemented here soon.
    </p>
  </div>

  <div class="mt-8">
    <a href="/items" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition duration-150 ease-in-out">
      Manage Items
    </a>
  </div>

  <!-- Placeholder for item list and other dashboard components -->
</div>