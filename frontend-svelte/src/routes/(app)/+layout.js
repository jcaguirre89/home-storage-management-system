import { user } from '../../stores/auth';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';

/**
 * @typedef {Object} AppUser
 * @property {string} uid
 * @property {string | null} email
 * @property {boolean} emailVerified
 * @property {string | null} displayName
 * @property {string | null} householdId
 */

/**
 * @typedef {Object} AuthStoreValue
 * @property {AppUser | null} user
 * @property {boolean} loading
 * @property {Error | null} error
 * @property {Record<string, any> | null} profile
 */

export async function load() {
  if (browser) {
    return new Promise((resolve, reject) => {
      /** @type {() => void} */
      let unsubscribe;
      /** @param {AuthStoreValue} authStore */
      unsubscribe = user.subscribe(authStore => {
        if (!authStore.loading) {
          if (unsubscribe) {
            unsubscribe();
          }
          if (!authStore.user) {
            try {
              throw redirect(307, '/login');
            } catch (e) {
              reject(e);
            }
          } else {
            /** @type {AppUser} */
            const currentUser = authStore.user;
            if (!currentUser.householdId) {
              try {
                throw redirect(307, '/household/setup');
              } catch (e) {
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
}