import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Requirements({ activePage, onNavigate }) {
  const stats = [
    { title: 'TOTAL GROUPS', value: '9', sub: 'Across all advisers', bg: 'bg-white border-l-4 border-stone-300' },
    { title: '100% COMPLETE', value: '3', sub: 'Ready / Published', bg: 'bg-white border-l-4 border-emerald-600' },
    { title: 'IN PROGRESS', value: '2', sub: 'Partial completion', bg: 'bg-white border-l-4 border-amber-500' },
    { title: 'HAS MISSING', value: '1', sub: 'Action needed', bg: 'bg-white border-l-4 border-red-500' },
  ];

  const groups = [
    { no: '01', name: 'Group Innovatech', title: 'AI-Driven Health Monitoring System', adviser: 'Ira Pongasi', sub: '5 submitted', miss: '1 Missing', progress: '84%', highlight: true },
    { no: '02', name: 'Group DataWave', title: 'Predictive Water Quality Monitoring', adviser: 'Ira Pongasi', sub: '3 Submitted', miss: '3 Missing', progress: '60%' },
    { no: '03', name: 'Group SmartSys', title: 'Smart Building Automation System', adviser: 'A. Ilustrisimo', sub: '6 Submitted', miss: 'None', progress: '100%', success: true },
    { no: '04', name: 'Group HealthAI', title: 'ML-Based Health Monitor for Elderly', adviser: 'Dr. Cendana', sub: '4 Submitted', miss: '2 Missing', progress: '67%', highlight: true },
    { no: '05', name: 'Group LangAI', title: 'Sentiment Analysis on Student Feedback', adviser: 'A. Ilustrisimo', sub: '6 Submitted', miss: 'None', progress: '100%', success: true },
    { no: '06', name: 'Group AgroTech', title: 'AI Crop Yield Prediction System', adviser: 'Dr. Cendana', sub: '6 Submitted', miss: 'None', progress: '100%', success: true },
    { no: '07', name: 'Group ChainSec', title: 'Blockchain-Based Credential System', adviser: 'J. Reyes', sub: '4 Submitted', miss: '2 Missing', progress: '65%', highlight: true },
    { no: '08', name: 'Group DataMinds', title: 'Predictive Analytics for Student Dropout', adviser: 'J. Reyes', sub: '6 Submitted', miss: 'None', progress: '100%', success: true },
    { no: '09', name: 'Group NeuroSync', title: 'Real-Time Flood Monitoring Mobile App', adviser: 'Ira Pongasi', sub: '4 Submitted', miss: '2 Missing', progress: '67%' },
    { no: '10', name: 'Group EduForward', title: 'Gamification in K-12 STEM Education', adviser: 'Ira Pongasi', sub: '3 Submitted', miss: '3 Missing', progress: '60%' },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} />
        
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Requirements Tracking</h1>
            <p className="text-xs text-stone-500 mt-0.5">Monitor completion status across all research groups under your supervision</p>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((card, idx) => (
              <div key={idx} className={`p-4 rounded-xl shadow-sm border border-stone-200/60 ${card.bg}`}>
                <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">{card.title}</p>
                <p className="text-2xl font-bold text-stone-800 my-1">{card.value}</p>
                <p className="text-xs text-stone-500">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#4a1024] text-white font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 text-center w-12">No.</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Research Title</th>
                    <th className="py-3.5 px-4">Adviser</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Missing</th>
                    <th className="py-3.5 px-4 text-center">Completion</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {groups.map((row) => (
                    <tr key={row.no} className={`hover:bg-stone-50/80 transition-colors ${row.highlight ? 'bg-amber-50/30' : row.success ? 'bg-emerald-50/10' : ''}`}>
                      <td className="py-3 px-4 text-center text-stone-400 font-normal">{row.no}</td>
                      <td className="py-3 px-4 font-bold text-stone-800">{row.name}</td>
                      <td className="py-3 px-4 text-stone-600 max-w-xs truncate">{row.title}</td>
                      <td className="py-3 px-4 text-stone-700">{row.adviser}</td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                          {row.sub}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${row.miss === 'None' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {row.miss}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-stone-800">{row.progress}</td>
                      <td className="py-3 px-4 text-center">
                        <button className="px-3 py-1 text-[#4a1024] border border-[#4a1024] rounded-lg text-[11px] font-bold hover:bg-[#4a1024] hover:text-white transition-all">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>Showing 1–10 of 16 groups</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 text-stone-400">‹</button>
                <button className="px-2.5 py-1 bg-[#4a1024] text-white rounded font-bold">1</button>
                <button className="px-2.5 py-1 border border-stone-200 rounded hover:bg-stone-50">2</button>
                <button className="px-2 py-1 border border-stone-200 rounded hover:bg-stone-50">›</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}