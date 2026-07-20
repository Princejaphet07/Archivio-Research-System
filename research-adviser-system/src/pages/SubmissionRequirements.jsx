import React from 'react';
import Layout from '../components/Layout';

function SubmissionRequirements() {
  const requirements = [
    { name: 'Final Manuscript', checked: true },
    { name: 'Approval Sheet', checked: true },
    { name: 'Dataset Files', checked: true },
    { name: 'Video Pitch', checked: true },
    { name: 'Upload URL', checked: true },
    { name: 'Signature Page', checked: true },
    { name: 'User Manual', checked: false },
    { name: 'Contact Person / Point Person', checked: false },
  ];

  return (
    <Layout title="Submission Requirements" breadcrumb="ARCHIVIO › Submission Requirements" showSearch={true}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Submission Requirements</h1>
          <p className="text-sm text-gray-500">Set what items your student groups must submit for their research to be considered complete</p>
        </div>

        {/* Info Banner */}
        <div className="bg-[#eff6ff] border border-[#bfdbfe] p-4 rounded-lg flex gap-3 text-sm text-[#1e40af]">
          <span className="text-xl">ℹ️</span>
          <p>These requirements apply to all groups under your advisory. The Dean may have additional department-wide requirements. Groups must complete both sets to be eligible for publishing.</p>
        </div>

        {/* Checklist Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">My Requirement Checklist</h3>
              <p className="text-xs text-gray-500">Select items students must submit · drag ∷ to reorder priority</p>
            </div>
            <button className="bg-[#7a2e46] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5f2135] transition">
              + Add Requirement
            </button>
          </div>

          <div className="space-y-3">
            {requirements.map((req, i) => (
              <div key={i} className={`flex items-center justify-between border ${req.checked ? 'border-gray-200' : 'border-gray-100 opacity-60'} rounded-lg p-3 hover:bg-gray-50 transition`}>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 cursor-move">∷</span>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${req.checked ? 'bg-[#7a2e46] border-[#7a2e46] text-white' : 'bg-gray-100 border-gray-300'}`}>
                    {req.checked && '✓'}
                  </div>
                  <span className={`text-sm ${req.checked ? 'font-medium text-gray-900' : 'text-gray-500'}`}>{req.name}</span>
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
          </div>

          <div className="mt-6 text-xs text-gray-500">
            💡 <span className="font-bold text-[#7a2e46]">Unchecked items</span> are disabled and won't count toward student completion scores. Drag the ∷ handle to reorder priorities.
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default SubmissionRequirements;