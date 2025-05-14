<script lang="ts">
  // Placeholder for household management page
  // You can import user and household stores here if needed in the future
  // import { user } from '../../stores/auth';
  // import { householdStore } from '../../stores/household';
</script>

<svelte:head>
  <title>Manage Household</title>
</svelte:head>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6 text-gray-800">Manage Your Household</h1>

  <div class="bg-white shadow-md rounded-lg p-8 text-center">
    <p class="text-xl text-gray-700 mb-4">
      This is where you'll manage your household settings, invite members, and more.
    </p>
    <p class="text-gray-500">
      (Household Management Page - Coming Soon)
    </p>
    <!-- Future components like HouseholdSettings.svelte and HouseholdMembers.svelte will go here -->
  </div>

  <!-- Example of how you might display household info if loaded -->
  <!--
  {#if $householdStore.loading}
    <p>Loading household details...</p>
  {:else if $householdStore.error}
    <p class="text-red-500">Error: {$householdStore.error.message}</p>
  {:else if $householdStore.id}
    <div class="mt-6 bg-gray-50 p-4 rounded-md">
      <h2 class="text-xl font-semibold">Current Household: {$householdStore.name}</h2>
      <p>ID: {$householdStore.id}</p>
      <p>Owner: {$householdStore.ownerUserId}</p>
      <p>Members: {$householdStore.memberUserIds?.join(', ')}</p>
    </div>
  {:else if $user.user && !$user.user.householdId}
    <p class="mt-6 text-center text-orange-600">
        You are not currently part of a household. <a href="/household/setup" class="underline hover:text-orange-800">Create or join one.</a>
    </p>
  {/if}
  -->
</div>