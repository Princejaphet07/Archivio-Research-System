import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { db, auth, storage } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logActivity } from '../firebase/logActivity';
import { PDFDocument } from 'pdf-lib';

// Dynamic requirements fetched from DB instead of hardcoded array

export default function RequirementsPage({ onLogout, studentName, initials, studentUid, groupName, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [submissionDocId, setSubmissionDocId] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [documentsMeta, setDocumentsMeta] = useState({});
  const [uploadingItem, setUploadingItem] = useState(null);
  const [requirements, setRequirements] = useState([]);

  const fileInputRefs = useRef({});

  // ── Fetch submissions & requirements ────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const uid = studentUid || auth.currentUser?.uid;
        if (!uid) { setLoadingData(false); return; }

        // 1. Get student's group to find adviserUid
        let adviserUid = null;
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', uid)));
        if (!groupSnap.empty) {
          adviserUid = groupSnap.docs[0].data().adviserUid;
        } else {
          // Check if they are a member
          const allGroupsSnap = await getDocs(collection(db, 'groups'));
          for (const doc of allGroupsSnap.docs) {
            const data = doc.data();
            if (data.members?.some(m => m.email === auth.currentUser?.email)) {
              adviserUid = data.adviserUid;
              break;
            }
          }
        }

        // 2. Fetch active requirements
        const reqSnap = await getDocs(collection(db, 'requirements'));
        const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const activeReqs = allReqs.filter(r => 
          (r.scope === 'global' && r.status === 'approved') || 
          (r.scope === 'adviser' && r.adviserUid === adviserUid && r.status === 'approved')
        );
        // Sort: global first by priority
        activeReqs.sort((a, b) => {
          if (a.scope === 'global' && b.scope === 'global') return (a.priority || 0) - (b.priority || 0);
          if (a.scope === 'global') return -1;
          if (b.scope === 'global') return 1;
          return 0;
        });
        setRequirements(activeReqs);

        // 3. Fetch submission
        const subSnap = await getDocs(query(collection(db, 'submissions'), where('studentUid', '==', uid)));
        if (!subSnap.empty) {
          const subs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          subs.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          const subDocId = subs[0].id;
          const subData = subs[0];
          setSubmissionDocId(subDocId);
          setUploadedDocs(subData.uploadedDocs || []);
          setDocumentsMeta(subData.documents || {});
        } else {
          setSubmissionDocId(null);
          setUploadedDocs([]);
          setDocumentsMeta({});
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [studentUid]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUploadFile = async (item, file) => {
    if (!file) return;
    setUploadingItem(item.id);

    try {
      const uid = studentUid || auth.currentUser?.uid;
      const displayName = studentName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      let fileUrl = '';
      
      // Upload to Cloudinary
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'Archivio'); // From your screenshot
        
        // Use 'auto' to support raw files (PDFs/ZIPs) and images/videos
        const res = await fetch('https://api.cloudinary.com/v1_1/peqpcqug/auto/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) {
          throw new Error('Cloudinary upload failed');
        }
        
        const data = await res.json();
        fileUrl = data.secure_url;
      } catch (uploadErr) {
        console.warn('Cloudinary upload failed. Saving metadata to Firestore anyway.', uploadErr);
        fileUrl = '#'; // Fallback link
      }

      const sizeStr = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
        : (file.size / 1024).toFixed(1) + ' KB';

      let pageCount = null;
      if (item.id === 'Final Manuscript' && file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          pageCount = pdfDoc.getPageCount();
        } catch (pdfErr) {
          console.warn('Failed to extract PDF pages:', pdfErr);
        }
      }

      const fileMeta = {
        name: file.name,
        size: sizeStr,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        url: fileUrl,
        type: 'file',
        ...(pageCount && { pageCount })
      };

      await saveToFirestore(item.id, fileMeta, displayName);
      
      await logActivity({
        user: displayName,
        role: 'Student',
        action: `Uploaded requirement document`,
        details: `${item.title}: ${file.name}`,
        status: 'Success'
      });

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingItem(null);
    }
  };

  const handleUploadUrl = async (item) => {
    const url = prompt(`Enter ${item.title} (e.g., https://github.com/...):`);
    if (!url) return;

    setUploadingItem(item.id);
    try {
      const displayName = studentName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      const urlMeta = {
        name: url.length > 30 ? url.substring(0, 30) + '...' : url,
        size: 'Link',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        url: url,
        type: 'url',
      };

      await saveToFirestore(item.id, urlMeta, displayName);

      await logActivity({
        user: displayName,
        role: 'Student',
        action: `Added requirement URL`,
        details: `${item.title}: ${urlMeta.name}`,
        status: 'Success'
      });
    } catch (error) {
      console.error('URL upload error:', error);
    } finally {
      setUploadingItem(null);
    }
  };

  const saveToFirestore = async (itemId, meta, displayName) => {
    const uid = studentUid || auth.currentUser?.uid;
    const subRef = collection(db, 'submissions');

    if (submissionDocId) {
      // Update existing document
      const docRef = doc(db, 'submissions', submissionDocId);
      const updatePayload = {
        uploadedDocs: arrayUnion(itemId),
        [`documents.${itemId}`]: meta,
        updatedAt: new Date().toISOString()
      };
      if (meta.pageCount) updatePayload.pageCount = meta.pageCount;
      await updateDoc(docRef, updatePayload);
    } else {
      // Create new submission document
      const newSub = {
        studentUid: uid,
        studentName: displayName,
        groupName: groupName || 'Your Group',
        uploadedDocs: [itemId],
        requiredDocs: requirements.map(r => r.id),
        documents: { [itemId]: meta },
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (meta.pageCount) newSub.pageCount = meta.pageCount;
      const addedDoc = await addDoc(subRef, newSub);
      setSubmissionDocId(addedDoc.id);
    }

    // Update local state
    if (!uploadedDocs.includes(itemId)) setUploadedDocs(prev => [...prev, itemId]);
    setDocumentsMeta(prev => ({ ...prev, [itemId]: meta }));
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to remove ${item.title}?`)) return;

    try {
      const displayName = studentName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      const docRef = doc(db, 'submissions', submissionDocId);
      const fileUrl = documentsMeta[item.id]?.url;

      // Attempt to delete from Cloudinary backend
      if (fileUrl && fileUrl.includes('cloudinary.com')) {
        try {
          await fetch('http://localhost:3001/api/delete-cloudinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl })
          });
        } catch (err) {
          console.warn('Backend cloudinary delete failed:', err);
        }
      }
      
      await updateDoc(docRef, {
        uploadedDocs: arrayRemove(item.id),
        [`documents.${item.id}`]: deleteField(),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setUploadedDocs(prev => prev.filter(id => id !== item.id));
      setDocumentsMeta(prev => {
        const newMeta = { ...prev };
        delete newMeta[item.id];
        return newMeta;
      });

      await logActivity({
        user: displayName,
        role: 'Student',
        action: `Removed requirement document`,
        details: item.title,
        status: 'Success'
      });

    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const totalCount = requirements.length;
  const uploadedCount = uploadedDocs.length;
  const missingCount = totalCount - uploadedCount;
  const progressPercent = Math.round((uploadedCount / totalCount) * 100);

  // Fallback initials
  const displayInitials = initials || (studentName ? studentName.substring(0, 2).toUpperCase() : 'ST');

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Requirements'} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        studentName={studentName || 'Student'}
        initials={displayInitials}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-[90px] flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-black/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">Requirements</h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 rounded-full border border-[#E8DFCB] bg-transparent flex items-center justify-center hover:bg-black/5 transition-all">
              <svg className="w-5 h-5 text-[#8A7B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#CF3645] rounded-full ring-2 ring-[#FDF9ED]"></span>
            </button>
            
            <div className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              {displayInitials}
            </div>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6 pt-2">
            
            {/* PAGE TITLE */}
            <div>
              <h2 className="font-serif font-bold text-[28px] text-[#1A1A1A] mb-1">Supporting Documents</h2>
              <p className="text-gray-500 text-[14px]">Submit all required documents for your research</p>
            </div>

            {/* PROGRESS BAR CARD */}
            <div className="w-full bg-[#F3EADB] rounded-2xl p-6 flex items-center justify-between shadow-sm border border-[#E8DFCB]/50">
              <div className="w-48">
                {loadingData ? (
                   <div className="h-6 w-24 bg-stone-200 animate-pulse rounded mb-1" />
                ) : (
                   <h3 className="text-[22px] font-serif font-bold text-[#7B1F35]">{uploadedCount} of {totalCount}</h3>
                )}
                <p className="text-[13px] text-gray-500">documents submitted</p>
              </div>
              
              <div className="flex-1 px-8">
                <div className="w-full bg-[#E8DFCB] h-3 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-[#7B1F35] h-full rounded-full transition-all duration-700" 
                    style={{ width: `${loadingData ? 0 : progressPercent}%` }} 
                  />
                </div>
                {loadingData ? (
                  <div className="h-3 w-20 bg-stone-200 animate-pulse rounded" />
                ) : (
                  <p className="text-[12px] font-bold text-[#7B1F35]">{progressPercent}% complete</p>
                )}
              </div>

              <div className="w-48 flex justify-end">
                {missingCount === 0 && !loadingData ? (
                  <span className="bg-[#E6F4EA] text-[#1E8E3E] text-[13px] font-bold px-4 py-2 rounded-full border border-[#CEEAD6]">
                    ✓ Complete
                  </span>
                ) : (
                  <span className="bg-[#FCE8EB] text-[#CF3645] text-[13px] font-bold px-4 py-2 rounded-full flex items-center gap-2 border border-[#F5C2C7]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {missingCount} missing
                  </span>
                )}
              </div>
            </div>

            {/* DOCUMENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {requirements.map((item) => {
                const isUploaded = uploadedDocs.includes(item.id);
                const meta = documentsMeta[item.id];
                const isUploadingThis = uploadingItem === item.id;

                if (isUploaded && meta) {
                  // ── SUBMITTED CARD ──
                  return (
                    <div key={item.id} className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#7B1F35] flex flex-col h-full transition-transform hover:-translate-y-0.5 duration-200">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-xl">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-[15px]">{item.title}</h4>
                          <span className="text-[9px] font-bold text-[#7B1F35] tracking-widest uppercase bg-[#F4DEE5] px-2 py-0.5 rounded">Required</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-[13px] mb-6 flex-1">{item.desc}</p>
                      
                      <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-4 mb-4 relative group">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          <div className="min-w-0 flex-1">
                            {meta.url && meta.url !== '#' ? (
                              <a href={meta.url} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-[#7B1F35] hover:underline truncate block w-full">
                                {meta.name}
                              </a>
                            ) : (
                              <p className="text-[13px] font-bold text-[#1A1A1A] truncate w-full">{meta.name}</p>
                            )}
                            <p className="text-[11px] text-gray-500">{meta.size} · {meta.date}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E8E3E]">
                          <span className="w-2 h-2 bg-[#1E8E3E] rounded-full"></span> Submitted
                        </span>
                        <div className="flex items-center gap-3 text-[12px] font-bold text-[#7B1F35]">
                          <button 
                            className="hover:underline"
                            onClick={() => {
                              if (item.type === 'url') handleUploadUrl(item);
                              else fileInputRefs.current[item.id]?.click();
                            }}
                          >
                            Replace
                          </button>
                          <span className="text-gray-300">·</span>
                          <button className="hover:underline text-gray-500" onClick={() => handleDelete(item)}>Delete</button>
                        </div>
                      </div>
                      
                      {/* Hidden File Input for Replace */}
                      <input 
                        type="file" 
                        ref={el => fileInputRefs.current[item.id] = el}
                        className="hidden"
                        onChange={(e) => handleUploadFile(item, e.target.files[0])}
                      />
                    </div>
                  );
                }

                // ── MISSING CARD ──
                return (
                  <div key={item.id} className={`bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#CF3645] flex flex-col h-full transition-transform hover:-translate-y-0.5 duration-200 ${isUploadingThis ? 'opacity-70 pointer-events-none' : ''}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-xl">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">{item.title}</h4>
                        <span className="text-[9px] font-bold text-[#CF3645] tracking-widest uppercase bg-[#FCE8EB] px-2 py-0.5 rounded">Required</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-[13px] mb-6 flex-1">{item.desc}</p>
                    
                    <div 
                      className="border-2 border-dashed border-[#CF3645]/40 bg-[#FCE8EB]/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FCE8EB]/60 transition-colors mt-auto relative overflow-hidden"
                      onClick={() => {
                        if (item.type === 'url') handleUploadUrl(item);
                        else fileInputRefs.current[item.id]?.click();
                      }}
                    >
                      {isUploadingThis ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-[#CF3645]/30 border-t-[#CF3645] rounded-full animate-spin" />
                          <span className="text-[#CF3645] font-bold text-[12px]">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-[#8C9BB4] rounded text-white flex items-center justify-center mb-2 shadow-sm">
                            {item.type === 'url' ? (
                              <span className="font-bold text-sm">URL</span>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            )}
                          </div>
                          <p className="text-[#CF3645] font-bold text-[13px]">
                            {item.type === 'url' ? 'Click to enter URL' : 'Drop file here or browse'}
                          </p>
                          <p className="text-[#CF3645]/60 text-[11px] mt-1">
                            {item.type === 'url' ? 'GitHub or Publisher Link' : 'Any format · max 50MB'}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Hidden File Input */}
                    <input 
                      type="file" 
                      ref={el => fileInputRefs.current[item.id] = el}
                      className="hidden"
                      onChange={(e) => handleUploadFile(item, e.target.files[0])}
                    />
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}