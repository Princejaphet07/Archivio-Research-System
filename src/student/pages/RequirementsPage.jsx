import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth, storage } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, deleteField, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logActivity } from '../../firebase/logActivity';
import { PDFDocument } from 'pdf-lib';
import Swal from 'sweetalert2';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { AlertTriangle } from 'lucide-react';
import { Card, CardBody, StatusBadge, PremiumButton } from '../../components/ui/Card';

// Dynamic requirements fetched from DB instead of hardcoded array

export default function RequirementsPage({ onLogout, studentName, initials, studentUid, groupName, activeTab, setActiveTab, profilePhotoUrl, role, leaderUid }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [submissionDocId, setSubmissionDocId] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [documentsMeta, setDocumentsMeta] = useState({});
  const [uploadingItem, setUploadingItem] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [documentRevisions, setDocumentRevisions] = useState({});
  const [adviserUid, setAdviserUid] = useState(null);
  const [viewerState, setViewerState] = useState({ isOpen: false, url: '', title: '', reqId: null });

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

        let resolvedAdviserUid = null;
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', uid)));
        if (!groupSnap.empty) {
          resolvedAdviserUid = groupSnap.docs[0].data().adviserUid;
        } else {
          const allGroupsSnap = await getDocs(collection(db, 'groups'));
          for (const doc of allGroupsSnap.docs) {
            const data = doc.data();
            if (data.members?.some(m => m.email === auth.currentUser?.email)) {
              resolvedAdviserUid = data.adviserUid;
              break;
            }
          }
        }
        setAdviserUid(resolvedAdviserUid);

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
            setDocumentRevisions(subData.documentRevisions || {});
          } else {
            setSubmissionDocId(null);
            setUploadedDocs([]);
            setDocumentsMeta({});
            setDocumentRevisions({});
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

      // Upload to Firebase Storage
      try {
        const fileExtension = file.name.split('.').pop();
        const timestamp = Date.now();
        const storagePath = `requirements/${uid}/${item.id}_${timestamp}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      } catch (uploadErr) {
        console.error('Firebase Storage upload failed:', uploadErr);
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: 'Firebase Storage rejected the file. Please check your internet connection or file size.',
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
    const itemTitle = requirements.find(r => r.id === itemId)?.title || 'Document';
    const hadRevision = !!documentRevisions?.[itemId];

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

      // If this item had a revision request, clear it on re-upload
      if (hadRevision) {
        updatePayload[`documentRevisions.${itemId}`] = deleteField();
      }

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

    // Student self-notification
    await addDoc(collection(db, 'notifications'), {
      userId: uid,
      title: hadRevision ? '✅ Revision Resubmitted' : 'Document Uploaded',
      message: hadRevision
        ? `You resubmitted "${itemTitle}" after revision. Your adviser will review it.`
        : `You successfully uploaded: ${itemTitle}`,
      isRead: false,
      createdAt: serverTimestamp()
    });

    // Notify the adviser if student resubmitted a revised document
    if (hadRevision && adviserUid) {
      await addDoc(collection(db, 'notifications'), {
        userId: adviserUid,
        title: '📄 Student Resubmitted Revision',
        message: `${displayName} has resubmitted "${itemTitle}" after your revision request. Please review the updated file.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    // Update local state
    if (!uploadedDocs.includes(itemId)) setUploadedDocs(prev => [...prev, itemId]);
    setDocumentsMeta(prev => ({ ...prev, [itemId]: meta }));
    if (hadRevision) setDocumentRevisions(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    
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

      // Attempt to delete from Firebase Storage
      if (fileUrl && fileUrl.includes('firebasestorage')) {
        try {
          const fileRef = ref(storage, fileUrl);
          await deleteObject(fileRef);
        } catch (err) {
          console.warn('Firebase Storage delete failed:', err);
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
  const displayInitials = initials || (studentName ? studentName.substring(0, 2).toUpperCase() : 'ST');

  return (
    <div className="flex w-full min-h-screen bg-[#f5f0e6] dark:bg-stone-950 font-sans overflow-hidden transition-colors">

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
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <PortalHeader 
          title="Requirements" 
          initials={displayInitials} 
          setSidebarOpen={setSidebarOpen} 
          setActiveTab={setActiveTab}
          profilePhotoUrl={profilePhotoUrl} role={role}
        />
        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6 pt-2">

            {/* PAGE TITLE */}
            <div>
              <h2 className="font-serif font-bold text-[28px] text-[#1A1A1A] dark:text-stone-100 mb-1">Supporting Documents</h2>
              <p className="text-gray-500 dark:text-stone-400 text-[14px]">Submit all required documents for your research</p>
            </div>

            {/* PROGRESS BAR CARD */}
            <Card hover className="w-full">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#7B1F35] to-[#C73D4C]" />
              <CardBody className="flex items-center justify-between pt-8">
                <div className="w-48">
                  {loadingData ? (
                    <div className="h-8 w-28 bg-stone-200 dark:bg-stone-800 animate-pulse rounded mb-1" />
                  ) : (
                    <h3 className="text-[30px] font-serif font-bold text-[#7B1F35] dark:text-[#D05353] leading-none">
                      {uploadedCount} <span className="text-[18px] text-stone-400 dark:text-stone-500">of {totalCount}</span>
                    </h3>
                  )}
                  <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-1">documents submitted</p>
                </div>

                <div className="flex-1 px-8">
                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-[#7B1F35] to-[#C73D4C] h-full rounded-full transition-all duration-700"
                      style={{ width: `${loadingData ? 0 : progressPercent}%` }}
                    />
                  </div>
                  {loadingData ? (
                    <div className="h-3 w-20 bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
                  ) : (
                    <p className="text-[12px] font-bold text-[#7B1F35] dark:text-[#D05353]">{progressPercent}% complete</p>
                  )}
                </div>

                <div className="w-48 flex justify-end">
                  {missingCount === 0 && !loadingData ? (
                    <StatusBadge status="approved" />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-full border bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {missingCount} missing
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* DOCUMENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {requirements.map((item) => {
                const isUploaded = uploadedDocs.includes(item.id);
                const meta = documentsMeta[item.id];
                const isUploadingThis = uploadingItem === item.id;

                if (isUploaded && meta) {
                  // ── SUBMITTED CARD ──
                  const hasRevision = !!documentRevisions[item.id];
                  return (
                    <Card key={item.id} hover className="flex flex-col h-full">
                      {/* top accent */}
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${hasRevision ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-[#7B1F35] to-[#C73D4C]'}`} />
                      <CardBody className="flex flex-col flex-1 pt-7">
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${hasRevision ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20'}`}>
                            {item.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1A1A1A] dark:text-stone-100 text-[15px]">{item.title}</h4>
                            <span className="text-[9px] font-bold text-[#7B1F35] dark:text-[#D05353] tracking-widest uppercase bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20 px-2 py-0.5 rounded">Required</span>
                          </div>
                        </div>
                        <p className="text-stone-500 dark:text-stone-400 text-[13px] mb-4 flex-1">{item.desc}</p>

                        <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700 rounded-xl p-4 mb-4">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-stone-400 dark:text-stone-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            <div className="min-w-0 flex-1">
                              {meta.url && meta.url !== '#' ? (
                                <button
                                  onClick={() => setViewerState({ isOpen: true, url: meta.url, title: item.title, reqId: item.id })}
                                  className="text-[13px] font-bold text-[#7B1F35] dark:text-[#D05353] hover:underline truncate block w-full text-left"
                                >
                                  {meta.name}
                                </button>
                              ) : (
                                <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-stone-100 truncate">{meta.name}</p>
                              )}
                              <p className="text-[11px] text-stone-500 dark:text-stone-400">{meta.size} · {meta.date}</p>
                              {hasRevision && (
                                <button
                                  onClick={() => setViewerState({ isOpen: true, url: meta.url, title: item.title, reqId: item.id })}
                                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold rounded-lg border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200/60 transition-colors"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  View Revision Notes
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                          {hasRevision ? (
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" /> Revision Required
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 dark:text-green-400">
                              <span className="w-2 h-2 bg-green-500 rounded-full" /> Submitted
                            </span>
                          )}
                          <div className="flex items-center gap-3 text-[12px] font-bold">
                            <button
                              className="text-[#7B1F35] dark:text-[#D05353] hover:underline"
                              onClick={() => {
                                if (item.type === 'url') handleUploadUrl(item);
                                else fileInputRefs.current[item.id]?.click();
                              }}
                            >
                              Replace
                            </button>
                            <span className="text-stone-300 dark:text-stone-600">·</span>
                            <button className="hover:underline text-stone-500 dark:text-stone-400" onClick={() => handleDelete(item)}>Delete</button>
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
                      </CardBody>
                    </Card>
                  );
                }

                // ── MISSING CARD ──
                return (
                  <Card key={item.id} hover className={`flex flex-col h-full ${isUploadingThis ? 'opacity-70 pointer-events-none' : ''}`}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-400" />
                    <CardBody className="flex flex-col flex-1 pt-7">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0 text-xl">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] dark:text-stone-100 text-[15px]">{item.title}</h4>
                          <span className="text-[9px] font-bold text-red-600 dark:text-red-400 tracking-widest uppercase bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">Required</span>
                        </div>
                      </div>
                      <p className="text-stone-500 dark:text-stone-400 text-[13px] mb-4 flex-1">{item.desc}</p>

                      <div
                        className="border-2 border-dashed border-red-300/60 dark:border-red-800/50 bg-red-50/40 dark:bg-red-950/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-all mt-auto"
                        onClick={() => {
                          if (item.type === 'url') handleUploadUrl(item);
                          else fileInputRefs.current[item.id]?.click();
                        }}
                      >
                        {isUploadingThis ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                            <span className="text-red-500 font-bold text-[12px]">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-500 flex items-center justify-center mb-2">
                              {item.type === 'url' ? (
                                <span className="font-bold text-sm">URL</span>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              )}
                            </div>
                            <p className="text-red-500 dark:text-red-400 font-bold text-[13px]">
                              {item.type === 'url' ? 'Click to enter URL' : 'Drop file here or browse'}
                            </p>
                            <p className="text-red-400/70 dark:text-red-500/60 text-[11px] mt-1">
                              {item.type === 'url' ? 'GitHub or Publisher Link' : (isPdfOnly(item) ? 'PDF format · max 50MB' : 'PDF, ZIP, Word, Video · max 50MB')}
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
                    </CardBody>
                  </Card>
                );
              })}

            </div>
          </div>
        </div>
      </div>

      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ ...viewerState, isOpen: false, reqId: null })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
        role="student"
        initialNote={documentRevisions[viewerState.reqId] || ''}
      />
    </div>
  );
}
