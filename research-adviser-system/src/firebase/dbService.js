// Firestore Database Service for Research Adviser System
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './config';

// ========== RESEARCH OPERATIONS ==========

// Add new research paper
export const addResearch = async (researchData) => {
  try {
    const docRef = await addDoc(collection(db, 'research'), {
      ...researchData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all research papers
export const getAllResearch = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'research'));
    const research = [];
    querySnapshot.forEach((doc) => {
      research.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: research };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get research by ID
export const getResearchById = async (id) => {
  try {
    const docRef = doc(db, 'research', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Research not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update research
export const updateResearch = async (id, updates) => {
  try {
    const docRef = doc(db, 'research', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Delete research
export const deleteResearch = async (id) => {
  try {
    await deleteDoc(doc(db, 'research', id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== USER OPERATIONS ==========

// Add user profile
export const addUserProfile = async (userId, profileData) => {
  try {
    await addDoc(collection(db, 'users'), {
      userId,
      ...profileData,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const q = query(collection(db, 'users'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { success: true, data: { id: doc.id, ...doc.data() } };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== CATEGORY OPERATIONS ==========

// Add research category
export const addCategory = async (categoryData) => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...categoryData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all categories
export const getAllCategories = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    const categories = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== GROUP OPERATIONS ==========

// Add research group
export const addGroup = async (groupData) => {
  try {
    const docRef = await addDoc(collection(db, 'groups'), {
      ...groupData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get groups by adviser
export const getGroupsByAdviser = async (adviserId) => {
  try {
    const q = query(
      collection(db, 'groups'), 
      where('adviserId', '==', adviserId)
    );
    const querySnapshot = await getDocs(q);
    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== NOTIFICATION OPERATIONS ==========

// Add notification
export const addNotification = async (notificationData) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get user notifications
export const getUserNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
