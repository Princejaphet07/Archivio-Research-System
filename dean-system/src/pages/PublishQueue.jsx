import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

// ================= DATA =================
const QUEUE_ITEMS = [
  {
    id: '003',
    title: 'Predictive Analytics for Student Dropout',
    group: 'Group DataMinds',
    adviser: 'A. Ilustrisimo',
    approvedDate: 'Jan 25, 2027',
    isSelf: false,
  },
  {
    id: '011',
    title: 'E-Commerce Platform for Local Artisans',
    group: 'Group ArtisanAI',
    adviser: 'I. Pongasi',
    approvedDate: 'Feb 1, 2027',
    isSelf: false,
  },
  {
    id: '001',
    title: 'ML-Based Health Monitor',
    group: 'Group HealthAI',
    adviser: 'Dr. Cendana (You)',
    approvedDate: 'Feb 5, 2027',
    isSelf: true,
  },
  {
    id: '002',
    title: 'Smart Irrigation System Using IoT',
    group: 'Group Innovatech',
    adviser: 'I. Pongasi',
    approvedDate: 'Feb 6, 2027',
    isSelf: false,
  },
  {
    id: '005',
    title: 'AR-Enhanced Campus Navigation',
    group: 'Group ITGirls',
    adviser: 'A. Ilustrisimo',
    approvedDate: 'Feb 7, 2027',
    isSelf: false,
  },
];

const ADVISER_FILTERS = ['All Advisers', 'Dr. Cendana (You)', 'I. Pongasi', 'A. Ilustrisimo'];

export default function PublishQueue({ activePage, onNavigate }) {
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [published, setPublished] = useState({});

  const filtered = QUEUE_ITEMS.filter(
    (item) => adviserFilter === 'All Advisers' || item.adviser === adviserFilter || item.adviser.includes(adviserFilter.replace('All Advisers', ''))
  );

  const eligibleCount = QUEUE_ITEMS.length;
  const blockedCount = 1;

  const handlePublish = (id) => {
    setPublished((prev) => ({ ...prev, [id]: true }));
  };

  const handlePublishAll = () => {
    const all = {};
    QUEUE_ITEMS.forEach((item) => { all[item.id] = true; });
    setPublished(all);
  };

  return (
    <div className="flex h-screen w-full bg-[#fcfbfa] overflow-hidden font-sans antialiased">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage={activePage} />

        <main className="flex-1 overflow-y-auto p-8 bg-[#fbf9f6]">

          {/* ===== PAGE HEADER ===== */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">Publish Queue</h1>
              <p className="text-xs text-stone-400 mt-1 font-medium">
                Approved manuscripts ready for publication. 100% requirements completion required.
              </p>
            </div>
            <button
              onClick={handlePublishAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] hover:bg-[#b8911f] text-white rounded-xl text-sm font-bold shadow-md transition-colors whitespace-nowrap"
            >
              🌐 Publish All Eligible ({eligibleCount})
            </button>
          </div>

          {/* ===== TWO-COLUMN LAYOUT ===== */}
          <div className="grid grid-cols-3 gap-6">

            {/* ===== LEFT: AWAITING PUBLICATION LIST ===== */}
            <div className="col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">

              {/* Card Header */}
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Awaiting Publication</h2>
                  <p className="text-[11px] text-stone-400 mt-0.5">Approved → Ready to Publish</p>
                </div>
                {/* Adviser Filter */}
                <div className="relative">
                  <select
                    value={adviserFilter}
                    onChange={(e) => setAdviserFilter(e.target.value)}
                    className="appearance-none bg-stone-50 border border-stone-200 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 outline-none focus:ring-1 focus:ring-[#7a1f3d] focus:border-[#7a1f3d] cursor-pointer"
                  >
                    {ADVISER_FILTERS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] pointer-events-none">▼</span>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-stone-100">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-stone-50/60
                      ${item.isSelf ? 'border-l-4 border-l-[#f8d070] bg-amber-50/20' : ''}`}
                  >
                    {/* File Icon */}
                    <div className="w-10 h-12 bg-stone-100 rounded-lg flex items-center justify-center shrink-0 border border-stone-200">
                      <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-stone-900 truncate">{item.title}</h3>
                      <p className={`text-[11px] font-medium mt-0.5 ${item.isSelf ? 'text-[#7a1f3d]' : 'text-stone-400'}`}>
                        {item.group} · {item.adviser} · Approved {item.approvedDate}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Approved
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          100% Requirements Complete
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="px-4 py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                        Preview
                      </button>
                      {published[item.id] ? (
                        <span className="px-4 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                          ✓ Published
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePublish(item.id)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-[#7a1f3d] rounded-lg hover:bg-[#5a162d] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          🌐 Publish
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="flex flex-col gap-5">

              {/* Status Flow Card */}
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6">
                <h2 className="text-sm font-bold text-stone-900 tracking-tight">Status Flow</h2>
                <p className="text-[11px] text-stone-400 mt-0.5 mb-5">Workflow stages</p>

                <div className="space-y-1">

                  {/* Pending */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800">Pending</p>
                      <p className="text-[10px] text-stone-400">Reviewed by Adviser</p>
                    </div>
                    <span className="text-sm font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">8</span>
                  </div>

                  {/* Arrow down */}
                  <div className="flex justify-center py-0.5">
                    <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Approved */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800">Approved</p>
                      <p className="text-[10px] text-stone-400">Approve by Adviser</p>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">6</span>
                  </div>

                  {/* Arrow down */}
                  <div className="flex justify-center py-0.5">
                    <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Published */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014.5 9 15.3 15.3 0 01-4.5 9 15.3 15.3 0 01-4.5-9A15.3 15.3 0 0112 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800">Published <span className="font-normal text-stone-400">(Live in Archive)</span></p>
                      <p className="text-[10px] text-stone-400">Reviewed &amp; Approved by Dean</p>
                    </div>
                    <span className="text-sm font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">21</span>
                  </div>
                </div>

                {/* Warning note */}
                <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-amber-500 text-sm">⚠</span>
                  <p className="text-[10px] font-bold text-amber-700">100% completion required to publish</p>
                </div>
              </div>

              {/* Publish Summary Card */}
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6">
                <h2 className="text-sm font-bold text-stone-900 tracking-tight mb-4">Publish Summary</h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500 font-medium">Eligible (100% complete)</span>
                    <span className="text-sm font-extrabold text-stone-900">{eligibleCount}</span>
                  </div>
                  <div className="h-px bg-stone-100"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500 font-medium">Blocked (incomplete)</span>
                    <span className="text-sm font-extrabold text-red-600">{blockedCount}</span>
                  </div>
                </div>

                <button
                  onClick={handlePublishAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c9a227] hover:bg-[#b8911f] text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  🌐 Publish {eligibleCount} Eligible Papers
                </button>
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  );
}