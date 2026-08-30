import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';

function SettingsModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsSaving(true);
    setMessage('');
    
    try {
      await updateProfile(currentUser, { displayName });
      setMessage('Profile updated successfully!');
      
      // Reload window to reflect changes in Header immediately
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-950">
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200">Account Settings</h2>
          <button 
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-400 mb-1">Email Address (Read Only)</label>
              <input 
                type="email" 
                value={currentUser?.email || ''} 
                disabled
                className="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-500 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7a2e46] dark:focus:ring-[#d6ad60]"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {message}
              </p>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-[#3d0c1b] dark:bg-[#d6ad60] text-white dark:text-[#3d0c1b] font-medium hover:bg-[#5a142a] dark:hover:bg-[#ebdcb9] transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default SettingsModal;
