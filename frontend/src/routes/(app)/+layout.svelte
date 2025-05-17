<script lang="ts">
  // This layout can be extended later if needed for (app) group specific UI
  import Header from '../../components/Layout/Header.svelte'; // Corrected path
  import { user } from '../../stores/auth'; // Corrected path
  // import { goto } from '$app/navigation'; // No longer needed here
  import { browser } from '$app/environment';
  // import { onMount } from 'svelte'; // No longer needed here

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

  // Auth guard for routes in (app) group - REMOVED onMount block
  // The guard in +layout.js handles redirection.
</script>

{#if browser && ($user as UserStoreValue).loading}
  <div class="min-h-screen flex items-center justify-center">
    <p>Loading authentication state...</p> <!-- Or a spinner component -->
  </div>
{:else if browser && !($user as UserStoreValue).user && !($user as UserStoreValue).loading}
  <!-- This state should be handled by the redirect in +layout.js -->
  <!-- If seen, it's a brief moment before client-side redirect by +layout.js -->
  <div class="min-h-screen flex items-center justify-center">
    <p>Redirecting to login...</p>
  </div>
{:else}
  <!-- Render layout structure for SSR (user might be null) and for authenticated client-side -->
  <Header />
  <main class="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>
{/if}