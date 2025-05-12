import { user } from '../../stores/auth';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';

export async function load() {
  if (browser) {
    return new Promise((resolve) => {
      const unsubscribe = user.subscribe(authStore => {
        if (!authStore.loading) {
          if (!authStore.user) {
            unsubscribe();
            throw redirect(307, '/login');
          }
          unsubscribe();
          resolve({});
        }
      });
    });
  }
  // For SSR, if we could get the user session from a cookie or similar, we could check here.
  // However, with Firebase client-side auth, the store is the primary source of truth after hydration.
  // The client-side check will handle redirection after the app loads.
  // If you have a server-side session mechanism (e.g., cookies set by backend after login),
  // you would check that here using `event.locals`.
  return {};
}