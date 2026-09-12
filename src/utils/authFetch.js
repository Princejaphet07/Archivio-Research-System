/**
 * Authenticated Backend API Fetch Helper
 *
 * Automatically attaches the current Firebase ID token as a Bearer token
 * to all requests to the email-service backend.
 * Use this instead of plain fetch() for all protected /api/ endpoints.
 */
import { auth } from '../firebase/config';

/**
 * Makes an authenticated POST request to the email backend.
 * @param {string} url - Full URL including the endpoint
 * @param {object} body - JSON body to send
 * @returns {Promise<Response>}
 */
export async function authFetch(url, body) {
  let idToken = null;

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      idToken = await currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('Could not get ID token:', err.message);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
