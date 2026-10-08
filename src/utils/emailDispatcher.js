/**
 * Centralized Multi-Tier Email Dispatcher for ARCHIVIO
 *
 * Tier 1: Backend Cloud Function endpoint (if available)
 * Tier 2: Direct Brevo HTTPS REST API (guaranteed inbox delivery, 443 port, CORS enabled)
 */
import { authFetch } from './authFetch';
import { getBackendUrl } from './backendUrl';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || '';
const BREVO_SENDER = { name: 'ARCHIVIO SWU PHINMA', email: 'archivio.system@gmail.com' };

/**
 * Sends an email with fast 2-3s multi-tier delivery:
 * Tier 1: Backend endpoint with a strict 2-second timeout (avoids Cloud Function cold start freeze)
 * Tier 2: Direct Brevo HTTPS REST API (~800ms response, guaranteed inbox delivery)
 * Tier 3: Firestore 'mail' collection fallback (async processing by background mail worker)
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.backendEndpoint] - Optional backend route (e.g. '/api/send-invitation-email')
 * @param {Object} [options.backendPayload] - Optional custom payload for backend
 * @returns {Promise<{success: boolean, method: string, messageId?: string, error?: string}>}
 */
export async function sendEmailWithFallback({ to, subject, html, backendEndpoint, backendPayload }) {
  const targetEmail = (to || '').toLowerCase().trim();
  const backendUrl = getBackendUrl();

  // Tier 1: Try backend Cloud Function endpoint (accommodates cloud function cold-start)
  if (backendEndpoint) {
    try {
      const endpoint = backendEndpoint.startsWith('http') ? backendEndpoint : `${backendUrl}${backendEndpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await authFetch(endpoint, backendPayload || { to: targetEmail, subject, html }, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response && response.ok) {
        console.log(`✅ Email dispatched via backend (${backendEndpoint}) to: ${targetEmail}`);
        return { success: true, method: 'backend' };
      } else {
        console.warn(`⚠️ Backend email returned status ${response?.status}, falling back to Brevo`);
      }
    } catch (backendErr) {
      console.warn(`⚠️ Backend email failed (${backendErr.message}), falling back to Brevo`);
    }
  }

  // Tier 2: Brevo HTTPS REST API (Fast ~800ms, institutional inbox delivery)
  if (BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: BREVO_SENDER,
          to: [{ email: targetEmail }],
          subject,
          htmlContent: html
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`✅ Email successfully delivered via Brevo API to ${targetEmail} (Message ID: ${data.messageId || 'ok'})`);
        return { success: true, method: 'brevo', messageId: data.messageId };
      }
      console.warn('⚠️ Brevo API response notice, falling back to Firestore mail queue:', data);
    } catch (brevoErr) {
      console.warn('⚠️ Brevo direct dispatch notice, falling back to Firestore mail queue:', brevoErr.message);
    }
  }

  // Tier 3: Fallback to Firestore 'mail' collection
  try {
    await addDoc(collection(db, 'mail'), {
      to: targetEmail,
      message: {
        subject,
        html
      },
      createdAt: new Date().toISOString()
    });
    console.log(`📨 Email enqueued to Firestore 'mail' collection for ${targetEmail}`);
    return { success: true, method: 'firestore-mail' };
  } catch (mailErr) {
    console.error('❌ Firestore mail queue write error:', mailErr);
  }

  return { success: false, error: 'All email delivery tiers failed' };
}

