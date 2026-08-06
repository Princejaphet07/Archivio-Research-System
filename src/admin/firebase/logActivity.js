import { collection, addDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Writes a real activity log entry to Firestore `activity_logs` collection.
 *
 * @param {Object} params
 * @param {string} params.user       - Email or display name of the user performing the action
 * @param {string} params.role       - Role of the user (e.g. 'System Admin', 'Super Admin', 'Dean')
 * @param {string} params.action     - Description of the action performed
 * @param {'Success'|'Failed'|'Pending'} params.status - Result status
 * @param {string} [params.details]  - Optional extra detail (e.g. college name, document title)
 * @param {string} [params.ip]       - Optional IP address (not reliably available client-side)
 */
export const logActivity = async ({ user, role, action, status, details = '', ip = 'N/A' }) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      user:      user      || 'Unknown',
      role:      role      || '—',
      action:    action    || 'Unknown action',
      status:    status    || 'Success',
      details:   details,
      ip:        ip,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Logging should never break the app — fail silently
    console.warn('⚠️ Failed to write activity log:', err);
  }
};
