import React, { useState } from 'react';
import Layout from '../components/Layout';

function ResearchCategories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#7a2e46');
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('🔗');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { name: 'Machine Learning', dept: '42 dept', mine: '3 mine', icon: '🤖', color: 'border-t-pink-800', bgColor: '#7a2e46' },
    { name: 'IoT & Embedded', dept: '31 dept', mine: '2 mine', icon: '📡', color: 'border-t-blue-800', bgColor: '#1e40af' },
    { name: 'Web Systems', dept: '28 dept', mine: '0 mine', icon: '🌐', color: 'border-t-green-600', bgColor: '#059669' },
    { name: 'Mobile Apps', dept: '22 dept', mine: '0 mine', icon: '📱', color: 'border-t-yellow-500', bgColor: '#eab308' },
    { name: 'Data Analytics', dept: '11 dept', mine: '0 mine', icon: '📊', color: 'border-t-teal-600', bgColor: '#0d9488' },
    { name: 'Cybersecurity', dept: '14 dept', mine: '0 mine', icon: '🔒', color: 'border-t-red-700', bgColor: '#b91c1c' },
    { name: 'Blockchain', dept: '5 dept', mine: '0 mine', icon: '🔗', color: 'border-t-purple-600', bgColor: '#9333ea' },
  ];

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

  const handleCreateCategory = () => {
    // Handle category creation logic here
    console.log({
      name: categoryName,
      icon: categoryIcon,
      color: selectedColor,
      description: categoryDescription
    });
    setIsModalOpen(false);
    // Reset form
    setCategoryName('');
    setCategoryIcon('🔗');
    setSelectedColor('#7a2e46');
    setCategoryDescription('');
  };

  const filteredCategories = categories.filter(cat => {
    if (!searchQuery) return true;
    return cat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Layout title="Research Categories" breadcrumb="ARCHIVIO › Research Categories" showSearch={true} searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Research Categories</h1>
            <p className="text-sm text-gray-500">Create and manage research paper categories for your submissions</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#7a2e46] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5f2135] transition"
          >
            + New Category
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat, i) => (
            <div key={i} className={`bg-white rounded-xl shadow-sm border border-gray-200 border-t-4 ${cat.color} p-5 flex flex-col justify-between h-40`}>
              <div>
                <div className="text-2xl mb-1">{cat.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg">{cat.name}</h3>
                <p className="text-xs text-gray-500">{cat.dept} · {cat.mine}</p>
              </div>
              <div className="flex gap-2">
                <button className="border border-gray-200 rounded px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  ✏️ Edit
                </button>
                <button className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                  🗑️
                </button>
              </div>
            </div>
          ))}
          
          {/* Add New Category Card */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-transparent border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center h-40 text-gray-400 hover:text-[#7a2e46] hover:border-[#7a2e46] hover:bg-white transition group"
          >
            <span className="text-3xl font-light mb-2 group-hover:scale-110 transition">+</span>
            <span className="text-sm font-semibold">Add New Category</span>
          </button>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-serif font-bold text-gray-900">New Research Category</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Category Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. Blockchain Technology" 
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900"
                  />
                </div>

                {/* Icon / Emoji */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Icon / Emoji
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={categoryIcon}
                      onChange={(e) => setCategoryIcon(e.target.value)}
                      placeholder="🔗" 
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900"
                      maxLength="2"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 11a5 5 0 110-10 5 5 0 010 10z"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Color Tag */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
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
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Description (Optional)
                  </label>
                  <textarea 
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Brief description of this research category..." 
                    rows="3"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCategory}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#7a2e46] hover:bg-[#5f2135] transition"
                >
                  Create Category
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
