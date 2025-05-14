<script lang="ts">
  // This layout can be extended later if needed for (app) group specific UI
  import Header from '../../components/Layout/Header.svelte'; // Corrected path
  import { user } from '../../stores/auth'; // Corrected path
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
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

  // Auth guard for routes in (app) group
  onMount(() => {
    if (browser) {
      const unsubscribe = user.subscribe((authStore: UserStoreValue) => {
        if (!authStore.loading) {
          if (!authStore.user) {
            goto('/login');
          }
          unsubscribe(); // Unsubscribe after check to prevent memory leaks and multiple redirects
        }
      });
      // Cleanup subscription on component destroy
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  });
</script>

{#if ($user as UserStoreValue).user} <!-- Only show header and slot if user is definitively logged in -->
  <Header />
  <main class="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>
{:else if ($user as UserStoreValue).loading && browser}
  <div class="min-h-screen flex items-center justify-center">
    <p>Loading authentication state...</p> <!-- Or a spinner component -->
  </div>
{:else if browser}
  <!--
    This state (browser, not loading, no user) should ideally be caught by the redirect in onMount.
    If it ever shows, it implies a brief moment before redirection or an issue with redirection.
    A fallback or a global redirect handler might be better.
    For now, this will likely not be seen if the guard works correctly.
  -->
  <div class="min-h-screen flex items-center justify-center">
    <p>Redirecting to login...</p>
  </div>
{/if}