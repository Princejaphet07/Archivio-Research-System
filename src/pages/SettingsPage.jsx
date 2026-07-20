import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function SettingsPage({ onLogout, studentName, initials, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('Notifications'); // Set to Notifications to view it right away, change to 'Profile' if preferred

  const settingsTabs = [
    { id: 'Profile', icon: '👤' },
    { id: 'Password', icon: '🔒' },
    { id: 'Notifications', icon: '🔔' },
    { id: 'Log out', icon: '🚪' }
  ];

  // Notification Data Configuration
  const emailNotifications = [
    { id: 'email-1', icon: '💬', iconBg: 'bg-gray-200/60', title: 'Adviser feedback', desc: 'When your adviser leaves comments or suggestions', defaultChecked: true },
    { id: 'email-2', icon: '✓', iconBg: 'bg-purple-200/50', title: 'Manuscript approval', desc: 'When your manuscript is approved by adviser or dean', defaultChecked: true },
    { id: 'email-3', icon: '📋', iconBg: 'bg-blue-200/50', title: 'Document reminders', desc: 'When supporting documents are due or missing', defaultChecked: true },
    { id: 'email-4', icon: '🎉', iconBg: 'bg-pink-200/50', title: 'Publication updates', desc: 'When your research is published in the archive', defaultChecked: true },
  ];

  const inAppNotifications = [
    { id: 'inapp-1', icon: '🔔', iconBg: 'bg-yellow-200/50', title: 'Show in app bell', desc: 'Display notification dot when you have unread items', defaultChecked: true },
    { id: 'inapp-2', icon: '🔉', iconBg: 'bg-gray-200/60', title: 'Notification sounds', desc: 'Play a soft sound for new notifications', defaultChecked: false },
  ];

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9F1] font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Settings'} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
      />

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* ACTION HEADER */}
        <header className="h-[90px] flex items-center justify-between px-6 lg:px-10 z-10 shrink-0 pt-4">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-white rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h1 className="text-[28px] font-bold text-black leading-tight">Settings</h1>
            </div>
          </div>

          {/* Right Profile Actions */}
          <div className="flex items-center gap-5">
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#6B0F1A] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              {initials || 'JR'}
            </div>
          </div>
        </header>

        {/* SUBTITLE */}
        <div className="px-6 lg:px-10 pb-6">
          <p className="text-[15px] text-gray-500 font-medium">Manage your account and preferences</p>
        </div>

        {/* SCROLLABLE ROUTE BODY */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
          <div className="max-w-[1200px] flex flex-col md:flex-row gap-6">
            
            {/* Settings Sidebar */}
            <div className="w-full md:w-[260px] shrink-0 bg-[#EFE7D5] rounded-xl p-3 h-fit border border-[#E3DAC4]">
              <div className="flex flex-col gap-1">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'Log out' && onLogout) {
                        onLogout();
                      } else {
                        setActiveSettingsTab(tab.id);
                      }
                    }}
                    className={`flex items-center justify-between text-left px-4 py-3.5 rounded-lg font-medium text-[14px] transition-all ${
                      activeSettingsTab === tab.id
                        ? 'bg-[#F2DFE7] text-[#6B0F1A]'
                        : 'text-gray-700 hover:bg-[#E8DFC9]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[16px] grayscale opacity-70">{tab.icon}</span>
                      {tab.id}
                    </div>
                    {activeSettingsTab === tab.id && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Content Area */}
            <div className="flex-1 bg-[#EFE7D5] rounded-xl p-8 border border-[#E3DAC4] min-h-[600px]">
              
              {/* === PROFILE TAB === */}
              {activeSettingsTab === 'Profile' && (
                <div className="animate-fade-in flex flex-col h-full">
                  <div className="mb-6">
                    <h2 className="text-[24px] font-bold text-black font-serif mb-1">Profile Information</h2>
                    <p className="text-[14px] text-gray-500">Update your personal information</p>
                  </div>
                  <hr className="border-[#DFD5BE] mb-8" />
                  
                  <div className="flex items-center gap-6 mb-10">
                    <div className="w-[84px] h-[84px] rounded-full bg-[#6B0F1A] text-white flex items-center justify-center font-semibold text-[28px] shadow-sm tracking-wide">
                      HT
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <div>
                        <h4 className="text-[14px] font-bold text-black">Profile Photo</h4>
                        <p className="text-[12px] text-gray-500">JPG or PNG. Max 2MB.</p>
                      </div>
                      <button className="px-5 py-1.5 bg-[#6B0F1A] text-white text-[13px] font-medium rounded-full hover:bg-[#8C1523] transition-colors mt-1">
                        Change Photo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-800 ml-1">First Name</label>
                      <input type="text" defaultValue="Hylla" className="w-full bg-[#FCFBF8] border border-[#E3DAC4] text-[14px] text-black rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 transition-all shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-800 ml-1">Last Name</label>
                      <input type="text" defaultValue="Tejada" className="w-full bg-[#FCFBF8] border border-[#E3DAC4] text-[14px] text-black rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 transition-all shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-800 ml-1">Student Number</label>
                      <div className="relative">
                        <input type="text" defaultValue="20-2222-001" disabled className="w-full bg-[#E5DBC4] border border-[#DFD5BE] text-[14px] text-gray-600 rounded-lg pl-4 pr-10 py-3 outline-none cursor-not-allowed" />
                        <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-800 ml-1">Course</label>
                      <div className="relative">
                        <input type="text" defaultValue="Bachelor of Science in IT" disabled className="w-full bg-[#E5DBC4] border border-[#DFD5BE] text-[14px] text-gray-600 rounded-lg pl-4 pr-10 py-3 outline-none cursor-not-allowed" />
                        <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[13px] font-bold text-gray-800 ml-1">School Email</label>
                      <div className="relative">
                        <input type="text" defaultValue="htejada.swu@phinmaed.com" disabled className="w-full bg-[#E5DBC4] border border-[#DFD5BE] text-[14px] text-gray-600 rounded-lg pl-4 pr-10 py-3 outline-none cursor-not-allowed" />
                        <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 mb-auto">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <p className="text-[12px] text-gray-500 font-medium">Fields marked are managed by your institution and cannot be edited.</p>
                  </div>

                  <div className="flex justify-end items-center gap-4 mt-8 pt-4">
                    <button className="px-6 py-2.5 bg-white border border-[#DFD5BE] text-gray-700 text-[14px] font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm">Cancel</button>
                    <button className="px-6 py-2.5 bg-[#6B0F1A] text-white text-[14px] font-semibold rounded-full hover:bg-[#8C1523] transition-colors shadow-md">Save Changes</button>
                  </div>
                </div>
              )}

              {/* === PASSWORD TAB === */}
              {activeSettingsTab === 'Password' && (
                <div className="animate-fade-in flex flex-col h-full max-w-[800px]">
                  <div className="mb-6">
                    <h2 className="text-[24px] font-bold text-black font-serif mb-1">Change Password</h2>
                    <p className="text-[14px] text-gray-500">Keep your account secure with a strong password</p>
                  </div>
                  <hr className="border-[#DFD5BE] mb-6" />
                  
                  <div className="flex flex-col gap-1.5 mb-6">
                    <label className="text-[13px] font-bold text-gray-800 ml-1">Current Password</label>
                    <div className="relative">
                      <input type="password" defaultValue="•••••••••" className="w-full bg-[#FCFBF8] border border-[#E3DAC4] text-[14px] text-black rounded-lg pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 transition-all shadow-sm" />
                      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-1.5">
                    <label className="text-[13px] font-bold text-gray-800 ml-1">New Password</label>
                    <div className="relative">
                      <input type="password" placeholder="Enter a new password" className="w-full bg-[#FCFBF8] border border-[#E3DAC4] text-[14px] text-black placeholder:italic placeholder:text-gray-400 rounded-lg pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 transition-all shadow-sm" />
                      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-1 mb-1.5">
                    <span className="text-[11px] text-gray-400 font-medium">Password Strength</span>
                    <span className="text-[11px] text-[#2F855A] font-bold">Strong</span>
                  </div>
                  <div className="flex gap-1 mb-6">
                    <div className="h-1.5 w-1/3 bg-[#2F855A] rounded-full"></div>
                    <div className="h-1.5 w-1/3 bg-[#2F855A] rounded-full"></div>
                    <div className="h-1.5 w-1/3 bg-[#2F855A] rounded-full"></div>
                  </div>

                  <div className="mb-6 ml-1">
                    <p className="text-[12px] font-bold text-gray-800 mb-2.5">Requirements</p>
                    <div className="grid grid-cols-2 gap-y-2.5 text-[12px]">
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-3.5 h-3.5 text-[#2F855A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        At least 8 characters
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-3.5 h-3.5 text-[#2F855A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Contains uppercase letter
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-3.5 h-3.5 text-[#2F855A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Contains a number
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-3 h-3 text-[#D3C7B0] ml-0.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><circle cx="12" cy="12" r="10" /></svg>
                        Contains special character (!@#$...)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-6">
                    <label className="text-[13px] font-bold text-gray-800 ml-1">Confirm New Password</label>
                    <div className="relative">
                      <input type="password" placeholder="Re-enter your new password" className="w-full bg-[#FCFBF8] border border-[#E3DAC4] text-[14px] text-black placeholder:italic placeholder:text-gray-400 rounded-lg pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 transition-all shadow-sm" />
                      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-[#FDF9F1] border border-[#E3DAC4] mb-auto shadow-sm">
                    <svg className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.496 1.509 1.333 1.509 2.316V18" /></svg>
                    <div>
                      <p className="text-[13px] text-gray-900 font-bold mb-0.5">Use a unique password you don't use anywhere else.</p>
                      <p className="text-[13px] text-gray-500">Consider using a password manager to keep track.</p>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-4 mt-8 pt-4">
                    <button className="px-7 py-2.5 bg-white border border-[#DFD5BE] text-gray-700 text-[14px] font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm">Cancel</button>
                    <button className="px-7 py-2.5 bg-[#6B0F1A] text-white text-[14px] font-semibold rounded-full hover:bg-[#8C1523] transition-colors shadow-md">Update Password</button>
                  </div>
                </div>
              )}

              {/* === NOTIFICATIONS TAB === */}
              {activeSettingsTab === 'Notifications' && (
                <div className="animate-fade-in flex flex-col h-full max-w-[800px]">
                  
                  {/* Header */}
                  <div className="mb-8">
                    <h2 className="text-[24px] font-bold text-black font-serif mb-1">Notification Preferences</h2>
                    <p className="text-[14px] text-gray-500">Choose how you want to be notified about updates</p>
                  </div>

                  {/* Email Notifications Section */}
                  <div className="mb-8">
                    <h3 className="text-[11px] font-bold text-[#6B0F1A] tracking-widest uppercase mb-4 ml-1">Email Notifications</h3>
                    
                    <div className="flex flex-col gap-6">
                      {emailNotifications.map((item) => (
                        <div key={item.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${item.iconBg}`}>
                              {item.icon}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-gray-900">{item.title}</span>
                              <span className="text-[13px] text-gray-500">{item.desc}</span>
                            </div>
                          </div>
                          
                          {/* Custom Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                            <div className="w-11 h-6 bg-[#D3C7B0]/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B0F1A]"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-[#DFD5BE] mb-6" />

                  {/* In-App Notifications Section */}
                  <div className="mb-auto">
                    <h3 className="text-[11px] font-bold text-[#6B0F1A] tracking-widest uppercase mb-4 ml-1">In-App Notifications</h3>
                    
                    <div className="flex flex-col gap-6">
                      {inAppNotifications.map((item) => (
                        <div key={item.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${item.iconBg}`}>
                              {item.icon}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-gray-900">{item.title}</span>
                              <span className="text-[13px] text-gray-500">{item.desc}</span>
                            </div>
                          </div>
                          
                          {/* Custom Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                            <div className="w-11 h-6 bg-[#D3C7B0]/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B0F1A]"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end items-center gap-4 mt-12 pt-4">
                    <button className="px-7 py-2.5 bg-white border border-[#DFD5BE] text-gray-700 text-[14px] font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm">
                      Cancel
                    </button>
                    <button className="px-7 py-2.5 bg-[#6B0F1A] text-white text-[14px] font-semibold rounded-full hover:bg-[#8C1523] transition-colors shadow-md">
                      Save Preferences
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}