import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Custom hook to subscribe in real-time to active repository statistics
 * from Cloud Firestore `submissions` collection.
 * 
 * Returns:
 * - total: Total manuscripts in repository
 * - pending: Manuscripts currently pending review / in review
 * - published: Approved & published manuscripts
 */
export function useRepositoryStats() {
  const [stats, setStats] = useState({ total: 0, pending: 0, published: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const q = query(collection(db, 'submissions'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let total = snapshot.size;
          let pending = 0;
          let published = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.reviewStatus;
            if (status === 'published') {
              published++;
            } else if (status === 'pending' || status === 'in_review') {
              pending++;
            }
          });

          setStats({ total, pending, published });
          setLoading(false);
        },
        (error) => {
          console.warn('Repository stats listener notice:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up repository stats listener:', err);
      setLoading(false);
    }
  }, []);

  return { stats, loading };
}

export default useRepositoryStats;
