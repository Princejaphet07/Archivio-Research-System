import { collection, addDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Writes a real activity log entry to the shared Firestore `activity_logs` collection.
 * All portals (student, dean, adviser, admin) share the same Firebase project
 * so logs from any portal will appear in the System Administrator Activity Logs.
 *
 * @param {Object} params
 * @param {string} params.user    - Email or display name of the user
 * @param {string} params.role    - Role label: 'Student', 'Dean', 'Adviser', 'System Admin', 'Super Admin'
 * @param {string} params.action  - Description of what happened
 * @param {'Success'|'Failed'|'Pending'} params.status
 * @param {string} [params.details] - Extra context (group name, course, etc.)
 */
export const logActivity = async ({ user, role, action, status, details = '' }) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      user:      user      || 'Unknown',
      role:      role      || 'Student',
      action:    action    || 'Unknown action',
      status:    status    || 'Success',
      details:   details,
      ip:        'N/A',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Never break the app — fail silently
    console.warn('⚠️ Failed to write activity log:', err);
  }
};
