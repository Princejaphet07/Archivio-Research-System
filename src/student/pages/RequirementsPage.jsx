import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth, storage } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, deleteField, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logActivity } from '../../firebase/logActivity';
import { PDFDocument } from 'pdf-lib';
import Swal from 'sweetalert2';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';

// Dynamic requirements fetched from DB instead of hardcoded array

export default function RequirementsPage({ onLogout, studentName, initials, studentUid, groupName, activeTab, setActiveTab, profilePhotoUrl, role, leaderUid }) {
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
    let unsubReq = null;
    let unsubSub = null;

    const setupListeners = async () => {
      setLoadingData(true);
      try {
        const uid = studentUid || auth.currentUser?.uid;
        if (!uid) { setLoadingData(false); return; }

        let adviserUid = null;
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', uid)));
        if (!groupSnap.empty) {
          adviserUid = groupSnap.docs[0].data().adviserUid;
        } else {
          const allGroupsSnap = await getDocs(collection(db, 'groups'));
          for (const doc of allGroupsSnap.docs) {
            const data = doc.data();
            if (data.members?.some(m => m.email === auth.currentUser?.email)) {
              adviserUid = data.adviserUid;
              break;
            }
          }
        }

        unsubReq = onSnapshot(collection(db, 'requirements'), (reqSnap) => {
          const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const activeReqs = allReqs.filter(r =>
            (r.scope === 'global' && r.status === 'approved') ||
            (r.scope === 'adviser' && r.adviserUid === adviserUid && r.status === 'approved')
          );
          activeReqs.sort((a, b) => {
            if (a.scope === 'global' && b.scope === 'global') return (a.priority || 0) - (b.priority || 0);
            if (a.scope === 'global') return -1;
            if (b.scope === 'global') return 1;
            return 0;
          });
          setRequirements(activeReqs);
        }, (err) => console.error('Error listening to requirements:', err));

        const subQuery = query(collection(db, 'submissions'), where('studentUid', '==', uid));
        unsubSub = onSnapshot(subQuery, (subSnap) => {
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
          setLoadingData(false);
        }, (err) => {
          console.error('Error listening to submissions:', err);
          setLoadingData(false);
        });

      } catch (error) {
        console.error('Error setting up listeners:', error);
        setLoadingData(false);
      }
    };
    
    setupListeners();

    return () => {
      if (unsubReq) unsubReq();
      if (unsubSub) unsubSub();
    };
  }, [studentUid]);

  // Helper to determine if a requirement should be strictly PDF
  const isPdfOnly = (item) => {
    const title = (item.title || '').toLowerCase();
    return title.includes('manuscript') || title.includes('approval');
  };

  const handleUploadFile = async (item, file) => {
    if (!file) return;

    // Enforce PDF format conditionally
    if (isPdfOnly(item) && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      Swal.fire({ icon: 'error', title: 'Invalid File', text: 'This specific requirement must be a PDF file.' });
      return;
    }

    setUploadingItem(item.id);

    try {
      const uid = (role === 'member' && leaderUid) ? leaderUid : (studentUid || auth.currentUser?.uid);
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
        console.error('Cloudinary upload failed:', uploadErr);
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: 'Cloudinary rejected the file. If this is a PDF, it might be over the 10MB free tier limit. Please compress your PDF and try again.',
          confirmButtonColor: '#7B1F35'
        });
        setUploadingItem(null);
        return; // Stop the upload process completely
      }

      const sizeStr = file.size > 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(1) + ' KB';

      let pageCount = null;
      let base64Pdf = null;
      if (item.title === 'Final Manuscript' && file.type === 'application/pdf') {
        try {
          // Get base64 for AI extraction
          const reader = new FileReader();
          base64Pdf = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
          });

          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          pageCount = pdfDoc.getPageCount();
        } catch (pdfErr) {
          console.warn('Failed to extract PDF pages or base64:', pdfErr);
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

      const savedDocId = await saveToFirestore(item.id, fileMeta, displayName);

      await logActivity({
        user: displayName,
        role: 'Student',
        action: `Uploaded requirement document`,
        details: `${item.title}: ${file.name}`,
        status: 'Success'
      });

      // Background AI Abstract Extraction
      if (item.title === 'Final Manuscript' && savedDocId && (base64Pdf || (fileUrl && fileUrl !== '#' && fileUrl.startsWith('http')))) {
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          title: 'AI is reading your PDF...',
          text: 'Generating an abstract based on your research, please wait.',
          showConfirmButton: false,
          didOpen: () => { Swal.showLoading(); }
        });

        setTimeout(async () => {
          try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
            const payload = base64Pdf ? { pdfBase64: base64Pdf } : { pdfUrl: fileUrl };
            
            const res = await fetch(`${backendUrl}/api/ai/extract-abstract`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.abstract) {
              await updateDoc(doc(db, 'submissions', savedDocId), { abstract: data.abstract });
              
              Swal.fire({
                toast: true,
                position: 'bottom-end',
                icon: 'success',
                title: 'AI successfully generated an abstract for this PDF!',
                showConfirmButton: false,
                timer: 4000
              });
            } else if (!res.ok) {
              Swal.fire({
                toast: true,
                position: 'bottom-end',
                icon: 'error',
                title: 'AI failed to generate an abstract',
                showConfirmButton: false,
                timer: 4000
              });
            }
          } catch (aiErr) {
            console.error('Background AI extraction failed:', aiErr);
          }
        }, 1000); // slight delay to let UI breathe
      }

    } catch (error) {
      console.error('Upload error:', error);
      Swal.fire('Error', 'Failed to upload document. Please try again.', 'error');
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

    let currentDocId = submissionDocId;
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
      currentDocId = addedDoc.id;
    }

    const itemTitle = requirements.find(r => r.id === itemId)?.title || 'Document';
    await addDoc(collection(db, 'notifications'), {
      userId: uid,
      title: "Document Uploaded",
      message: `You successfully uploaded: ${itemTitle}`,
      isRead: false,
      createdAt: serverTimestamp()
    });

    // Update local state
    if (!uploadedDocs.includes(itemId)) setUploadedDocs(prev => [...prev, itemId]);
    setDocumentsMeta(prev => ({ ...prev, [itemId]: meta }));
    
    return currentDocId;
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to remove ${item.title}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove it!'
    });
    if (!result.isConfirmed) return;

    try {
      const displayName = studentName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      const docRef = doc(db, 'submissions', submissionDocId);
      const fileUrl = documentsMeta[item.id]?.url;

      // Attempt to delete from Cloudinary backend
      if (fileUrl && fileUrl.includes('cloudinary.com')) {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
          await fetch(`${backendUrl}/api/delete-cloudinary`, {
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

      await addDoc(collection(db, 'notifications'), {
        userId: auth.currentUser?.uid,
        title: "Document Removed",
        message: `You removed: ${item.title}`,
        isRead: false,
        createdAt: serverTimestamp()
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
  // Fallback initials
  const displayInitials = initials || (studentName ? studentName.substring(0, 2).toUpperCase() : 'ST');

  return (
    <div className="flex w-full min-h-screen bg-gradient-to-br from-[#fcfbf9] via-[#f5f0e6] to-[#efe5d5] font-sans overflow-hidden selection:bg-[#F4DEE5]">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={activeTab || 'Requirements'}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        studentName={studentName || 'Student'}
        initials={displayInitials}
        profilePhotoUrl={profilePhotoUrl} role={role}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[500px] h-[500px] bg-[#7B1F35]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[400px] h-[400px] bg-[#D4AF37]/10 rounded-full blur-[100px] pointer-events-none" />

        {/* HEADER */}
        <PortalHeader 
          title="Requirements" 
          initials={displayInitials} 
          setSidebarOpen={setSidebarOpen} 
          setActiveTab={setActiveTab}
          profilePhotoUrl={profilePhotoUrl} role={role}
        />
        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-12 z-10">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pt-4">

            {/* PAGE TITLE */}
            <div className="animate-fade-in-up">
              <h2 className="font-serif font-bold text-[32px] bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 mb-1">Supporting Documents</h2>
              <p className="text-gray-600 text-[15px] flex items-center gap-2">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Complete all required documents for your research approval
              </p>
            </div>

            {/* PROGRESS BAR CARD */}
            <div className="w-full bg-white/70 backdrop-blur-xl rounded-[24px] p-8 flex flex-col md:flex-row items-center justify-between shadow-[0_8px_30px_rgb(123,31,53,0.06)] border border-white/80 hover:shadow-[0_8px_30px_rgb(123,31,53,0.12)] transition-all duration-300">
              <div className="w-full md:w-48 mb-4 md:mb-0 text-center md:text-left">
                {loadingData ? (
                  <div className="h-8 w-28 bg-[#f5f0e6] animate-pulse rounded mb-1 mx-auto md:mx-0" />
                ) : (
                  <h3 className="text-[28px] font-serif font-bold text-gray-900 tracking-tight">
                    <span className="text-[#7B1F35]">{uploadedCount}</span> <span className="text-stone-300 text-2xl">/</span> <span className="text-stone-500">{totalCount}</span>
                  </h3>
                )}
                <p className="text-[13px] text-stone-500 uppercase tracking-widest font-bold mt-1">Files Submitted</p>
              </div>

              <div className="flex-1 w-full px-0 md:px-10">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[13px] font-bold text-stone-700">Overall Progress</span>
                  {loadingData ? (
                    <div className="h-4 w-12 bg-stone-200 animate-pulse rounded" />
                  ) : (
                    <span className="text-[14px] font-bold text-[#7B1F35]">{progressPercent}%</span>
                  )}
                </div>
                <div className="w-full bg-stone-100 h-4 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-[#7B1F35] to-[#a32946] h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${loadingData ? 0 : progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-48 flex justify-center md:justify-end mt-6 md:mt-0">
                {missingCount === 0 && !loadingData ? (
                  <span className="bg-[#f8f1df] text-[#9c7d1e] text-[14px] font-bold px-6 py-2.5 rounded-full border border-[#eedda5] shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    Completed
                  </span>
                ) : (
                  <span className="bg-red-50 text-red-700 text-[14px] font-bold px-6 py-2.5 rounded-full flex items-center gap-2 border border-red-100 shadow-sm">
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {missingCount} Pending
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
                    <div key={item.id} className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 hover:shadow-[0_12px_40px_rgb(123,31,53,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-[#e4c96d]" />
                      
                      <div className="flex items-start gap-4 mb-5 mt-2">
                        <div className="w-12 h-12 bg-[#f8f1df] rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-2xl border border-[#eedda5] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-[16px] leading-tight mb-1">{item.title}</h4>
                          <span className="text-[10px] font-bold text-[#9c7d1e] tracking-widest uppercase bg-[#f8f1df] px-2.5 py-1 rounded-md">Approved</span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-[13px] mb-6 flex-1 leading-relaxed">{item.desc}</p>

                      <div className="bg-gradient-to-br from-[#fcfbf9] to-[#f5f0e6] border border-[#efe5d5] rounded-2xl p-4 mb-5 relative group/file hover:border-[#D4AF37]/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <svg className="w-4 h-4 text-[#7B1F35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          </div>
                          <div className="min-w-0 flex-1 pt-1">
                            {meta.url && meta.url !== '#' ? (
                              <a href={meta.url} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-[#7B1F35] hover:text-[#5a1626] hover:underline truncate block w-full transition-colors">
                                {meta.name}
                              </a>
                            ) : (
                              <p className="text-[13.5px] font-bold text-gray-800 truncate w-full">{meta.name}</p>
                            )}
                            <p className="text-[11.5px] text-gray-500 mt-0.5">{meta.size} • {meta.date}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-stone-100">
                        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#1E8E3E] bg-[#E6F4EA] px-3 py-1 rounded-full border border-[#CEEAD6]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          Done
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-[#F4DEE5] rounded-lg text-[#7B1F35] transition-colors tooltip-trigger relative"
                            title="Replace File"
                            onClick={() => {
                              if (item.type === 'url') handleUploadUrl(item);
                              else fileInputRefs.current[item.id]?.click();
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                          <button 
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                            title="Delete" 
                            onClick={() => handleDelete(item)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Hidden File Input for Replace */}
                      <input
                        type="file"
                        accept={isPdfOnly(item) ? ".pdf" : ".pdf,.zip,video/*,.docx,image/*"}
                        ref={el => fileInputRefs.current[item.id] = el}
                        className="hidden"
                        onChange={(e) => handleUploadFile(item, e.target.files[0])}
                      />
                    </div>
                  );
                }

                // ── MISSING CARD ──
                return (
                  <div key={item.id} className={`bg-white/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 hover:shadow-[0_12px_40px_rgb(123,31,53,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden group ${isUploadingThis ? 'opacity-70 pointer-events-none' : ''}`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 to-stone-300 group-hover:from-[#7B1F35] group-hover:to-[#a32946] transition-all duration-500" />
                    
                    <div className="flex items-start gap-4 mb-4 mt-2">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-2xl border border-stone-100 group-hover:scale-110 transition-transform duration-300">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-[16px] leading-tight mb-1">{item.title}</h4>
                        <span className="text-[10px] font-bold text-red-700 tracking-widest uppercase bg-red-50 px-2.5 py-1 rounded-md border border-red-100/50">Required</span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-[13px] mb-6 flex-1 leading-relaxed">{item.desc}</p>

                    <div
                      className="border-2 border-dashed border-stone-300/70 bg-[#fcfbf9] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#7B1F35]/40 hover:bg-[#F4DEE5]/30 transition-all duration-300 mt-auto relative overflow-hidden group/drop"
                      onClick={() => {
                        if (item.type === 'url') handleUploadUrl(item);
                        else fileInputRefs.current[item.id]?.click();
                      }}
                    >
                      {isUploadingThis ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-3 border-[#F4DEE5] border-t-[#7B1F35] rounded-full animate-spin" />
                          <span className="text-[#7B1F35] font-bold text-[13px] animate-pulse">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-white rounded-full text-[#7B1F35] flex items-center justify-center mb-3 shadow-[0_2px_10px_rgb(0,0,0,0.06)] group-hover/drop:scale-110 group-hover/drop:bg-[#7B1F35] group-hover/drop:text-white transition-all duration-300">
                            {item.type === 'url' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            )}
                          </div>
                          <p className="text-gray-900 font-bold text-[14px] group-hover/drop:text-[#7B1F35] transition-colors">
                            {item.type === 'url' ? 'Click to enter URL' : 'Upload Document'}
                          </p>
                          <p className="text-stone-400 text-[11.5px] mt-1.5 font-medium">
                            {item.type === 'url' ? 'Paste external link here' : (isPdfOnly(item) ? 'PDF format only · max 50MB' : 'PDF, ZIP, DOCX · max 50MB')}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      accept={isPdfOnly(item) ? ".pdf" : ".pdf,.zip,video/*,.docx,image/*"}
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
