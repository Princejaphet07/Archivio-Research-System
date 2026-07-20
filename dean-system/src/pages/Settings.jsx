import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Settings({ activePage, onNavigate }) {
  const settingsTabs = [
    { icon: '📋', label: 'Completion Requirements', active: true },
    { icon: '✉️', label: 'Email Templates' },
    { icon: '🏛️', label: 'Department Info' },
    { icon: '📅', label: 'School Year' },
    { icon: '🔔', label: 'Notifications' },
    { icon: '🔒', label: 'Security' },
  ];

  const requirements = [
    { label: 'Final Manuscript', checked: true },
    { label: 'PPT slides', checked: true },
    { label: 'Dataset Files', checked: true },
    { label: 'Video Pitch', checked: true },
    { label: 'User Manual', checked: true },
    { label: 'Upload URL / Repository Link', checked: true },
    { label: 'Signature Page', checked: false },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} onMenuClick={() => {}} />
        
        <main className="p-6 lg:p-8 w-full max-w-[1400px] mx-auto flex-1">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Settings</h1>
            <p className="text-sm text-stone-500 mt-1">Configure system preferences and completion requirements</p>
          </div>

          {/* Main Content Layout - Forced Side-by-Side */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Column: Navigation Tabs */}
            <div className="w-full lg:w-[300px] shrink-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden py-2">
              <div className="space-y-0.5 px-2">
                {settingsTabs.map((tab, idx) => (
                  <button 
                    key={idx} 
                    className={`w-full flex items-center gap-3 text-left font-medium text-sm px-4 py-3 rounded-lg transition-all 
                    ${tab.active 
                      ? 'bg-[#f8ebef] text-[#7a1f3d] font-bold' 
                      : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    <span className={`text-base ${tab.active ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Requirements Checklist */}
            <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-stone-200 p-6 lg:p-8">
              
              {/* Checklist Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Completion Requirements Checklist</h3>
                  <p className="text-xs text-stone-500 mt-1">These apply to ALL research groups department-wide. Drag to reorder.</p>
                </div>
                <button className="bg-[#7a1f3d] hover:bg-[#631932] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm shrink-0">
                  + Add Requirement
                </button>
              </div>

              {/* Requirements List */}
              <div className="space-y-3">
                {requirements.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-stone-200 rounded-xl hover:shadow-sm transition-all bg-white group">
                    <div className="flex items-center gap-4">
                      {/* Drag Handle */}
                      <div className="text-stone-300 cursor-grab flex gap-0.5 px-1 hover:text-stone-400">
                        <div className="flex flex-col gap-1">
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Checkbox & Label */}
                      <input 
                        type="checkbox" 
                        defaultChecked={item.checked} 
                        className="w-5 h-5 rounded border-stone-300 accent-[#7a1f3d] cursor-pointer" 
                      />
                      <span className={`text-sm ${item.checked ? 'text-stone-900 font-bold' : 'text-stone-400 font-medium'}`}>
                        {item.label}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-md hover:bg-stone-50 text-stone-500 text-xs transition-colors">
                        ✏️
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-md hover:bg-red-50 text-stone-500 text-xs transition-colors">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Notice */}
              <div className="bg-[#f8ebef] p-4 rounded-xl flex items-center gap-3 mt-6">
                <span className="text-sm opacity-70">💡</span>
                <p className="text-[#7a1f3d] opacity-80 text-xs font-medium">
                  Unchecked items are disabled and won't count toward completion scores.
                </p>
              </div>
              
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}