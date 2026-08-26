import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import { Card, CardBody, SectionTitle, PremiumButton } from '../../components/ui/Card';

function ResearchCategories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#7a2e46');
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('🔗');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojiOptions = [
    // Tech & Science
    '🤖', '💻', '📡', '🌐', '📱', '🔋', '🔬', '🧬', '🧪', '🔭', '🛰️', '🚀', '⚙️', '🛠️', '🔌', '🧲', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️',
    // Data & Business
    '📊', '📈', '📉', '💼', '💰', '💵', '💳', '🧾', '💡', '🧠', '⚡', '🏢', '🏦', '🏭', '🛒', '📦', '📋', '📁', '📂', '📅', '⏱️',
    // Education & Arts
    '📚', '🎓', '📝', '✏️', '🖋️', '🎨', '🎭', '🎼', '🎹', '🎬', '📸', '📖', '🏫', '🧠', '💬', '💭', '🗣️', '📐', '📏', '✂️', '📌',
    // Nature & Environment
    '🌍', '🌎', '🌏', '🌿', '🌱', '🌳', '🌲', '🍃', '☀️', '🌤️', '🌧️', '⛈️', '❄️', '🌊', '💧', '🔥', '🐾', '🦋', '♻️', '🌾', '🌵',
    // Health & Medicine
    '🏥', '🩺', '💊', '💉', '🩹', '🦠', '🦷', '🦴', '🩸', '🚑', '⚕️', '🧘', '🏃', '🧠', '❤️', '🍏', '🍎', '🥦', '🥕',
    // Symbols & Misc
    '🔒', '🔓', '🔑', '🔗', '🛡️', '✅', '❌', '⚠️', '🛑', '❗', '❓', '🔍', '🔎', '💡', '🧭', '⚖️', '🏆', '🏅', '🎯', '🧩', '🎲'
  ];

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(fetched);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const colorOptions = [
    '#7a2e46', // Maroon
    '#1e40af', // Blue
    '#b91c1c', // Red
    '#eab308', // Yellow
    '#9333ea', // Purple
    '#0d9488', // Teal
    '#dc2626', // Bright Red
    '#475569', // Slate
  ];

  const resetForm = () => {
    setCategoryName('');
    setCategoryIcon('🔗');
    setSelectedColor('#7a2e46');
    setCategoryDescription('');
    setEditingId(null);
    setIsModalOpen(false);
    setShowEmojiPicker(false);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setCategoryName(cat.name);
    setCategoryIcon(cat.icon || '🔗');
    setSelectedColor(cat.bgColor || '#7a2e46');
    setCategoryDescription(cat.description || '');
    setEditingId(cat.id);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Category name is required' });
      return;
    }

    try {
      if (editingId) {
        // Edit existing
        await updateDoc(doc(db, 'categories', editingId), {
          name: categoryName,
          icon: categoryIcon,
          bgColor: selectedColor,
          description: categoryDescription,
          updatedAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'Updated!', text: 'Category updated successfully.', timer: 1500, showConfirmButton: false });
      } else {
        // Create new
        await addDoc(collection(db, 'categories'), {
          name: categoryName,
          icon: categoryIcon,
          bgColor: selectedColor,
          description: categoryDescription,
          createdBy: auth.currentUser?.email || 'Admin',
          createdAt: serverTimestamp()
        });
        
        await logActivity({
          user: auth.currentUser?.email || 'Adviser',
          role: 'Adviser',
          action: 'Created new category',
          status: 'Success',
          details: `Category: ${categoryName}`
        });
        
        Swal.fire({ icon: 'success', title: 'Created!', text: 'New category added.', timer: 1500, showConfirmButton: false });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save category.' });
    }
  };

  const handleDelete = async (id, name) => {
    const res = await Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        
        await logActivity({
          user: auth.currentUser?.email || 'Adviser',
          role: 'Adviser',
          action: 'Deleted category',
          status: 'Success',
          details: `Category: ${name}`
        });
        
        Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Category deleted.', timer: 1500, showConfirmButton: false });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete.' });
      }
    }
  };

  const filteredCategories = categories.filter(cat => {
    if (!searchQuery) return true;
    return cat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Layout title="Research Categories" breadcrumb="ARCHIVIO › Research Categories" showSearch={true} searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionTitle 
          sub="Create and manage research paper categories for your submissions"
          action={
            <PremiumButton onClick={openAddModal} variant="primary">
              + New Category
            </PremiumButton>
          }
        >
          Research Categories
        </SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <CardSkeleton borderTopColor="#7a2e46" />
              <CardSkeleton borderTopColor="#1e40af" />
              <CardSkeleton borderTopColor="#b91c1c" />
              <CardSkeleton borderTopColor="#eab308" />
            </>
          ) : (
            filteredCategories.map((cat, i) => (
              <Card key={cat.id || i} className="flex flex-col justify-between h-40 group" hover={true} style={{ borderTop: `4px solid ${cat.bgColor || '#7a2e46'}` }}>
                <CardBody className="flex flex-col h-full p-5">
                  <div className="flex-1">
                    <div className="text-2xl mb-1 group-hover:scale-110 transition-transform origin-left">{cat.icon || '🔗'}</div>
                    <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg line-clamp-1">{cat.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-stone-400">Global Category</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => openEditModal(cat)}
                      className="border border-gray-200 dark:border-stone-700 rounded px-3 py-1 text-xs font-semibold text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 flex items-center gap-1 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="border border-gray-200 dark:border-stone-700 rounded px-2 py-1 text-xs text-gray-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
          
          {/* Add New Category Card */}
          <Card 
            hover={true}
            onClick={openAddModal}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 bg-transparent flex flex-col items-center justify-center h-40 group text-stone-500 hover:border-[#7B1F35] hover:text-[#7B1F35]"
          >
            <span className="text-3xl font-light mb-2 group-hover:scale-110 transition-transform">+</span>
            <span className="text-[13px] font-bold">Add New Category</span>
          </Card>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-950 rounded-xl shadow-2xl max-w-md w-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-stone-800">
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-stone-100">{editingId ? 'Edit Category' : 'New Research Category'}</h2>
                <button 
                  onClick={resetForm}
                  className="text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Category Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. Blockchain Technology" 
                    list="standard-categories"
                    className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100"
                  />
                  <datalist id="standard-categories">
                    <option value="Computer Science" />
                    <option value="Information Technology" />
                    <option value="Information Systems" />
                    <option value="Software Engineering" />
                    <option value="Data Science & Analytics" />
                    <option value="Cybersecurity" />
                    <option value="Artificial Intelligence" />
                    <option value="Machine Learning" />
                    <option value="IoT & Embedded Systems" />
                    <option value="Business Administration" />
                    <option value="Education" />
                    <option value="Healthcare & Nursing" />
                    <option value="Tourism & Hospitality" />
                  </datalist>
                </div>

                {/* Icon / Emoji */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                    Icon / Emoji
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100 flex justify-between items-center transition"
                    >
                      <span className="text-xl leading-none">{categoryIcon}</span>
                      <span className="text-gray-400 dark:text-stone-500">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 11a5 5 0 110-10 5 5 0 010 10z"/>
                        </svg>
                      </span>
                    </button>
                    
                    {/* Emoji Dropdown / Grid */}
                    {showEmojiPicker && (
                      <div className="absolute z-10 mt-1 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg shadow-lg p-3 w-full animate-fade-in-down">
                        <div className="text-[10px] text-gray-400 dark:text-stone-500 font-bold uppercase tracking-wider mb-2">Select an Icon</div>
                        <div className="grid grid-cols-7 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                          {emojiOptions.map((emoji, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setCategoryIcon(emoji);
                                setShowEmojiPicker(false);
                              }}
                              className={`text-xl hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg p-1 transition ${categoryIcon === emoji ? 'bg-gray-100 dark:bg-stone-800 ring-1 ring-gray-300 dark:ring-stone-700' : ''}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Color Tag */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                    Color Tag
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          selectedColor === color 
                            ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                    Description (Optional)
                  </label>
                  <textarea 
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Brief description of this research category..." 
                    rows="3"
                    className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-stone-800">
                <button 
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCategory}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white dark:text-stone-900 bg-[#7a2e46] dark:bg-[#f8d070] hover:bg-[#5f2135] dark:hover:bg-[#ffe090] transition"
                >
                  {editingId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ResearchCategories;
