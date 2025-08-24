<script>
  export let searchTerm = '';
  export let placeholder = 'Search...';
</script>

<div class="my-4">
  <input
    type="search"
    bind:value={searchTerm}
    {placeholder}
    class="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 placeholder-gray-400"
  />
</div>