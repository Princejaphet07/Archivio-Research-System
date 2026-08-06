// Firebase Storage Service for Research Adviser System
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from './config';

// Upload file
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { 
      success: true, 
      url: downloadURL,
      path: snapshot.ref.fullPath 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Upload file with progress tracking
export const uploadFileWithProgress = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        reject({ success: false, error: error.message });
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            success: true,
            url: downloadURL,
            path: uploadTask.snapshot.ref.fullPath
          });
        } catch (error) {
          reject({ success: false, error: error.message });
        }
      }
    );
  });
};

// Upload research paper PDF
export const uploadResearchPaper = async (file, groupId, fileName) => {
  try {
    const path = `research/${groupId}/${fileName}`;
    return await uploadFile(file, path);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Upload profile picture
export const uploadProfilePicture = async (file, userId) => {
  try {
    const path = `profiles/${userId}/avatar.jpg`;
    return await uploadFile(file, path);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get file download URL
export const getFileURL = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Delete file
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// List all files in a directory
export const listFiles = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url: url
        };
      })
    );
    
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// List research papers for a group
export const listGroupResearchPapers = async (groupId) => {
  try {
    const path = `research/${groupId}`;
    return await listFiles(path);
  } catch (error) {
    return { success: false, error: error.message };
  }
};
