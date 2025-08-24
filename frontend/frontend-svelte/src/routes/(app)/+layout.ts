import { user, type AuthStoreValue, type AppUser } from '../../stores/auth';
import { redirect, type Load } from '@sveltejs/kit';
import { browser } from '$app/environment';

export const load: Load = async () => {
  if (browser) {
    return new Promise((resolve, reject) => {
      let unsubscribe: () => void;
      unsubscribe = user.subscribe((authStore: AuthStoreValue) => {
        if (!authStore.loading) {
          if (unsubscribe) {
            unsubscribe();
          }
          if (!authStore.user) {
            try {
              throw redirect(307, '/login');
            } catch (e) {
              // Kit's redirect throws errors, so we catch and reject the promise
              // to ensure the redirect is followed.
              reject(e);
            }
          } else {
            const currentUser = authStore.user as AppUser; // Already checked authStore.user is not null
            if (!currentUser.householdId) {
              try {
                throw redirect(307, '/household/setup');
              } catch (e) {
                 // Kit's redirect throws errors, so we catch and reject the promise
                 // to ensure the redirect is followed.
                reject(e);
              }
            } else {
              resolve({});
            }
          }
        }
      });
    });
  }
  return {};
};