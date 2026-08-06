import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';
import Swal from 'sweetalert2';

export default function ManuscriptPage({ onLogout, activeTab, setActiveTab, studentName, initials, profilePhotoUrl, role, leaderUid }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [studentData, setStudentData] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoadingData(false); return; }

    setLoadingData(true);

    const studentQuery = query(collection(db, 'students'), where('uid', '==', uid));
    const unsubscribeStudent = onSnapshot(studentQuery, (snapshot) => {
      if (!snapshot.empty) setStudentData(snapshot.docs[0].data());
    });

    return () => unsubscribeStudent();
  }, []);

  useEffect(() => {
    if (!studentData) return;

    const uid = auth.currentUser?.uid;
    const lookupUid = (role === 'member' && leaderUid) ? leaderUid : uid;

    if (!lookupUid) {
      setLoadingData(false);
      return;
    }

    const submissionQuery = query(collection(db, 'submissions'), where('studentUid', '==', lookupUid));
    const unsubscribeSubmission = onSnapshot(submissionQuery, (snapshot) => {
      if (!snapshot.empty) {
        const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        subs.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setSubmission(subs[0]);
        setSubmissionId(subs[0].id);
      } else {
        setSubmission(null);
        setSubmissionId(null);
      }
      setLoadingData(false);
    });

    return () => {
      unsubscribeSubmission();
    };
  }, [studentData]);

  const manuscript = submission?.documents?.['Final Manuscript'];
  const hasManuscript = !!manuscript;
  
  const researchTitle = studentData?.researchTitle || submission?.title || 'Research Title';
  const groupName = studentData?.groupName || submission?.groupName || 'Your Group';
  const members = studentData?.groupMembers || [];
  
  const abstract = submission?.abstract || 'No abstract provided. Click Edit to add an abstract.';
  const pageCount = submission?.pageCount || '0';
  const keywords = submission?.keywords || [];

  const handleEditDetails = async () => {
    if (!submissionId) {
      Swal.fire({ icon: 'info', title: 'No Submission', text: 'Please upload a manuscript first in the Requirements tab.', confirmButtonColor: '#7B1F35' });
      return;
    }
    const { value: formValues } = await Swal.fire({
      title: 'Edit Details',
      html:
        `<div style="text-align: left; margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #1A1A1A;">Number of Pages</div>` +
        `<input id="swal-pages" class="swal2-input" style="width: 100%; margin: 0 0 15px 0; box-sizing: border-box;" placeholder="e.g. 38" value="${pageCount}">` +
        `<div style="text-align: left; margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #1A1A1A;">Abstract</div>` +
        `<textarea id="swal-abstract" class="swal2-textarea" style="width: 100%; margin: 0 0 15px 0; height: 120px; box-sizing: border-box;" placeholder="Abstract">${abstract === 'No abstract provided. Click Edit to add an abstract.' ? '' : abstract}</textarea>` +
        `<div style="text-align: left; margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #1A1A1A;">Keywords (comma separated)</div>` +
        `<input id="swal-keywords" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="e.g. AI, Health, Tech" value="${keywords.join(', ')}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#7B1F35',
      preConfirm: () => {
        return {
          pageCount: document.getElementById('swal-pages').value,
          abstract: document.getElementById('swal-abstract').value,
          keywords: document.getElementById('swal-keywords').value.split(',').map(k => k.trim()).filter(k => k)
        }
      }
    });

    if (formValues) {
      try {
        await updateDoc(doc(db, 'submissions', submissionId), formValues);
        
        await addDoc(collection(db, 'notifications'), {
          userId: auth.currentUser?.uid,
          title: "Manuscript Updated",
          message: "You successfully updated your manuscript details.",
          isRead: false,
          createdAt: serverTimestamp()
        });

        Swal.fire({ icon: 'success', title: 'Saved!', text: 'Manuscript details updated.', confirmButtonColor: '#7B1F35' });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update details.', confirmButtonColor: '#7B1F35' });
      }
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Manuscript'} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
        studentName={studentName}
        initials={initials}
        profilePhotoUrl={profilePhotoUrl} role={role}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <PortalHeader 
          title="Manuscript" 
          initials={initials} 
          setSidebarOpen={setSidebarOpen} 
          setActiveTab={setActiveTab}
          profilePhotoUrl={profilePhotoUrl} role={role}
        />

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-[1200px] mx-auto animate-fade-in flex flex-col gap-6 pt-2">
            
            {/* BANNER */}
            <div className="w-full bg-[#7B1F35] rounded-2xl p-8 flex items-center justify-between relative overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 h-full w-[30%] bg-white/5 rounded-l-[100px] pointer-events-none transform -skew-x-12" />
              <div className="relative z-10">
                <h2 className="text-white text-[24px] font-serif font-bold mb-1">Your Research Manuscript</h2>
                <p className="text-white/80 text-[14px]">Manage your research paper. Replace or update as your adviser provides feedback.</p>
              </div>
              <div className="relative z-10">
                {hasManuscript ? (
                  <span className="bg-white text-[#1A1A1A] text-[13px] font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Uploaded
                  </span>
                ) : (
                  <span className="bg-[#CF3645] text-white border border-[#CF3645] text-[13px] font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    Not Uploaded
                  </span>
                )}
              </div>
            </div>

            {/* TWO COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: Current File */}
              <div className="lg:col-span-5 bg-[#F3EADB] rounded-2xl p-8 shadow-sm flex flex-col">
                <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-6">Current File</p>
                
                {/* PDF Thumbnail Mockup */}
                <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-lg p-6 flex flex-col items-center text-center mb-6 shadow-sm relative">
                  <div className="w-full bg-[#7B1F35] rounded-t-lg absolute top-0 left-0 h-12 flex items-center justify-center">
                    <p className="text-white/80 text-[8px] tracking-widest uppercase">Southwestern University</p>
                  </div>
                  <div className="mt-12 w-full">
                    <h4 className="font-serif font-bold text-[#7B1F35] text-[16px] mb-2 leading-tight uppercase px-4 truncate">{researchTitle}</h4>
                    <p className="text-gray-400 text-[10px] mb-1">A Capstone Research</p>
                    <p className="text-[#CF3645] text-[11px] font-bold mb-6">{groupName}</p>
                    {/* Mock text lines */}
                    <div className="flex flex-col gap-1.5 w-[80%] mx-auto mb-4">
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-full"></div>
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-[90%] mx-auto"></div>
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-[95%] mx-auto"></div>
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-[85%] mx-auto"></div>
                    </div>
                    <p className="text-gray-400 text-[8px]">Page 1 of {pageCount}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-[#1A1A1A] text-[16px] truncate">{manuscript?.name || 'No file uploaded yet'}</h3>
                  {hasManuscript ? (
                    <p className="text-gray-500 text-[13px]">{manuscript.size} · {pageCount} pages · Updated {manuscript.date}</p>
                  ) : (
                    <p className="text-gray-500 text-[13px]">Upload your manuscript in the Requirements tab.</p>
                  )}
                </div>

                <div className="flex gap-3 mb-4">
                  <button 
                    onClick={() => hasManuscript && window.open(manuscript.url, '_blank')}
                    disabled={!hasManuscript}
                    className={`flex-1 border border-[#D6CBB8] text-[#1A1A1A] text-[13px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors ${hasManuscript ? 'hover:bg-black/5' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Preview
                  </button>
                  <button 
                    onClick={() => {
                      if (!hasManuscript) return;
                      const a = document.createElement('a');
                      a.href = manuscript.url;
                      a.download = manuscript.name;
                      a.target = "_blank";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    disabled={!hasManuscript}
                    className={`flex-1 border border-[#D6CBB8] text-[#1A1A1A] text-[13px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors ${hasManuscript ? 'hover:bg-black/5' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>
                </div>
                
                <button onClick={() => setActiveTab('Requirements')} className="w-full bg-[#7B1F35] hover:bg-[#63182a] text-white text-[14px] font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {hasManuscript ? 'Replace Manuscript' : 'Upload Manuscript'}
                </button>
              </div>

              {/* RIGHT COLUMN: Research Details */}
              <div className="lg:col-span-7 bg-[#F3EADB] rounded-2xl p-8 shadow-sm flex flex-col">
                <div className="flex justify-between items-start border-b border-[#E8DFCB] pb-4 mb-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">Research Details</p>
                    <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A]">Manuscript Information</h3>
                  </div>
                  <button onClick={handleEditDetails} className="border border-[#D6CBB8] hover:bg-black/5 text-[#1A1A1A] text-[12px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Research Title</p>
                  <h4 className="font-serif font-bold text-[18px] text-[#1A1A1A]">{researchTitle}</h4>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Abstract</p>
                  <p className={`text-[14px] leading-relaxed ${abstract.includes('No abstract') ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                    {abstract}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Authors</p>
                    <p className="text-[#1A1A1A] font-bold text-[14px]">{members.length + 1} group member{members.length + 1 !== 1 ? 's' : ''}</p>
                    <p className="text-gray-500 text-[12px] mt-0.5 truncate">
                      {[studentData?.firstName?.charAt(0) + '. ' + studentData?.lastName, ...members.map(m => typeof m === 'object' ? m.name : m.split('@')[0])].join(' · ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Pages</p>
                    <p className="text-[#1A1A1A] font-bold text-[14px]">{pageCount} pages</p>
                    <p className="text-gray-500 text-[12px] mt-0.5">Including references & appendices</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.length > 0 ? keywords.map((tag, idx) => (
                      <span key={idx} className="border border-[#DDA3B6] text-[#7B1F35] bg-[#F9EBF0] px-3 py-1 rounded-full text-[12px] font-bold">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-gray-400 text-[12px] italic">No keywords added</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* VERSION HISTORY */}
            <div className="bg-[#F3EADB] rounded-2xl p-8 shadow-sm">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">Version History</p>
                  <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A]">Previous Uploads</h3>
                </div>
                <p className="text-gray-500 text-[13px]">Older versions are kept for adviser reference</p>
              </div>

              <div className="flex flex-col gap-3">
                {hasManuscript ? (
                  <div className="bg-[#F4DEE5] border border-[#EAD0D8] rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="bg-[#7B1F35] text-white text-[12px] font-bold px-3 py-1 rounded-full">v1.0</span>
                      <span className="text-[#7B1F35] font-bold text-[13px] flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-[#7B1F35] rounded-full"></span>
                        Current
                      </span>
                      <span className="text-gray-600 text-[13px] w-24">{manuscript.date}</span>
                      <span className="text-gray-500 text-[13px] w-16">{manuscript.size}</span>
                      <span className="text-gray-600 text-[13px] truncate flex-1">Initial upload</span>
                    </div>
                    <span className="text-gray-500 text-[12px] font-bold shrink-0">In use</span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-[13px] italic">No versions uploaded yet.</p>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
