import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { db, auth, storage } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, deleteField, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logActivity } from '../../firebase/logActivity';
import { PDFDocument } from 'pdf-lib';
import Swal from 'sweetalert2';
import NotificationBell from '../components/NotificationBell';
import PortalHeader from '../components/PortalHeader';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { AlertTriangle } from 'lucide-react';
import { Card, CardBody, StatusBadge, PremiumButton } from '../../components/ui/Card';
import { getBackendUrl } from '../../utils/backendUrl';

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
  const [documentAnnotations, setDocumentAnnotations] = useState({});
  const [documentResubmissions, setDocumentResubmissions] = useState({});
  const [reviewStatus, setReviewStatus] = useState('in_progress');
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
        const targetUid = (role === 'member' && leaderUid) ? leaderUid : (studentUid || auth.currentUser?.uid);
        if (!targetUid) { setLoadingData(false); return; }

        let resolvedAdviserUid = null;
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', targetUid)));
        if (!groupSnap.empty) {
          resolvedAdviserUid = groupSnap.docs[0].data().adviserUid;
        } else {
          const allGroupsSnap = await getDocs(collection(db, 'groups'));
          for (const doc of allGroupsSnap.docs) {
            const data = doc.data();
            if (data.members?.some(m => m.email === auth.currentUser?.email || m === auth.currentUser?.email)) {
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
            (r.scope === 'adviser' && r.adviserUid === resolvedAdviserUid && r.status === 'approved')
          );
          activeReqs.sort((a, b) => {
            if (a.scope === 'global' && b.scope === 'global') return (a.priority || 0) - (b.priority || 0);
            if (a.scope === 'global') return -1;
            if (b.scope === 'global') return 1;
            return 0;
          });
          setRequirements(activeReqs);
        }, (err) => console.error('Error listening to requirements:', err));

        const subQuery = query(collection(db, 'submissions'), where('studentUid', '==', targetUid));
        unsubSub = onSnapshot(subQuery, (subSnap) => {
          if (!subSnap.empty) {
            const subs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const getTime = (val) => {
              if (!val) return 0;
              if (typeof val.toMillis === 'function') return val.toMillis();
              if (typeof val.toDate === 'function') return val.toDate().getTime();
              if (val.seconds) return val.seconds * 1000;
              const t = new Date(val).getTime();
              return isNaN(t) ? 0 : t;
            };

            subs.sort((a, b) => {
              const timeA = getTime(a.updatedAt) || getTime(a.createdAt);
              const timeB = getTime(b.updatedAt) || getTime(b.createdAt);
              return timeB - timeA;
            });

            const subDocId = subs[0].id;
            const subData = subs[0];
            const metaMap = subData.documents || {};

            // Strictly filter uploaded docs to only those with valid file metadata (prevents phantom counts)
            const cleanUploadedDocs = (subData.uploadedDocs || []).filter(id => {
              const m = metaMap[id];
              return !!(m && (m.url || m.name));
            });

            // Ensure any requirement present in documents meta is also in cleanUploadedDocs
            Object.keys(metaMap).forEach(id => {
              const m = metaMap[id];
              if (m && (m.url || m.name) && !cleanUploadedDocs.includes(id)) {
                cleanUploadedDocs.push(id);
              }
            });

            // Self-heal: If Firestore has ghost/orphaned IDs in uploadedDocs, clean it up
            if (subDocId && (
              !subData.uploadedDocs ||
              subData.uploadedDocs.length !== cleanUploadedDocs.length ||
              subData.uploadedDocs.some(id => !cleanUploadedDocs.includes(id))
            )) {
              updateDoc(doc(db, 'submissions', subDocId), {
                uploadedDocs: cleanUploadedDocs
              }).catch(() => {});
            }

            setSubmissionDocId(subDocId);
            setUploadedDocs(cleanUploadedDocs);
            setDocumentsMeta(metaMap);
            setDocumentRevisions(subData.documentRevisions || {});
            setDocumentAnnotations(subData.documentAnnotations || {});
            setDocumentResubmissions(subData.documentResubmissions || {});
            setReviewStatus(subData.reviewStatus || subData.status || 'in_progress');
          } else {
            setSubmissionDocId(null);
            setUploadedDocs([]);
            setDocumentsMeta({});
            setDocumentRevisions({});
            setDocumentAnnotations({});
            setDocumentResubmissions({});
            setReviewStatus('in_progress');
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
  }, [studentUid, role, leaderUid]);

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
      if (item.title === 'Final Manuscript' && file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          pageCount = pdfDoc.getPageCount();
        } catch (pdfErr) {
          console.warn('Failed to extract PDF page count:', pdfErr);
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

      // Background AI Abstract Extraction (sets persistent abstractGenerating flag in Firestore)
      if (item.title === 'Final Manuscript' && savedDocId && fileUrl && fileUrl !== '#' && fileUrl.startsWith('http')) {
        try {
          await updateDoc(doc(db, 'submissions', savedDocId), { abstractGenerating: true });
        } catch (e) {
          console.warn('Failed to set abstractGenerating flag:', e);
        }

        // Detached background execution: user can navigate to any tab while indicator stays active
        (async () => {
          try {
            const backendUrl = getBackendUrl();
            const res = await fetch(`${backendUrl}/api/ai/extract-abstract`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdfUrl: fileUrl })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.abstract) {
                await updateDoc(doc(db, 'submissions', savedDocId), { 
                  abstract: data.abstract,
                  abstractGenerating: false
                });
                return;
              }
            }

            await updateDoc(doc(db, 'submissions', savedDocId), { abstractGenerating: false });
          } catch (aiErr) {
            console.warn('Background AI extraction notice (abstract can be set in manuscript settings):', aiErr.message || aiErr);
            try {
              await updateDoc(doc(db, 'submissions', savedDocId), { abstractGenerating: false });
            } catch (e) {}
          }
        })();
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

      // If this item had a revision request, mark it as resubmitted instead of deleting the note
      if (hadRevision) {
        updatePayload[`documentResubmissions.${itemId}`] = true;
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

  // ── Derived values (100% accurate and aligned with displayed cards) ───────────────────────
  const activeRequirements = requirements.filter(r => r.storageEnabled !== false && r.storageStatus !== 'suspended');
  const totalCount = activeRequirements.length;

  // A requirement is strictly considered submitted if its uploaded document metadata exists with valid url/name
  const submittedItems = activeRequirements.filter(item => {
    const meta = documentsMeta[item.id] || documentsMeta[item.title];
    return !!(meta && (meta.url || meta.name));
  });

  const uploadedCount = submittedItems.length;
  const missingCount = Math.max(0, totalCount - uploadedCount);
  const progressPercent = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

  const hasPendingRevisions = requirements.some(item => !!documentRevisions[item.id] && !documentResubmissions[item.id]);
  
  let displayStatus = reviewStatus;
  if (missingCount === 0) {
    if (reviewStatus === 'approved' || reviewStatus === 'published') {
      displayStatus = reviewStatus;
    } else if (reviewStatus === 'revision' && hasPendingRevisions) {
      displayStatus = 'revision';
    } else {
      displayStatus = 'submitted';
    }
  }

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
          profilePhotoUrl={profilePhotoUrl} 
          role={role}
          studentName={studentName}
          onLogout={onLogout}
        />
        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-10">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6 pt-2">

            {/* PAGE TITLE */}
            <div>
              <h2 className="font-serif font-bold text-[24px] sm:text-[28px] text-[#1A1A1A] dark:text-stone-100 mb-1 leading-tight">Supporting Documents</h2>
              <p className="text-gray-500 dark:text-stone-400 text-[13px] sm:text-[14px]">Submit all required documents for your research</p>
            </div>

            {/* PROGRESS BAR CARD */}
            <Card hover className="w-full">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#7B1F35] to-[#C73D4C]" />
              <CardBody className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-8 pt-6 sm:pt-8">
                <div className="w-full sm:w-48">
                  {loadingData ? (
                    <div className="h-8 w-28 bg-stone-200 dark:bg-stone-800 animate-pulse rounded mb-1" />
                  ) : (
                    <h3 className="text-[26px] sm:text-[30px] font-serif font-bold text-[#7B1F35] dark:text-[#D05353] leading-none">
                      {uploadedCount} <span className="text-[16px] sm:text-[18px] text-stone-400 dark:text-stone-500">of {totalCount}</span>
                    </h3>
                  )}
                  <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-1">documents submitted</p>
                </div>

                <div className="w-full sm:flex-1 sm:px-8">
                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-[#7B1F35] to-[#C73D4C] h-full rounded-full transition-all duration-700"
                      style={{ width: `${loadingData ? 0 : progressPercent}%` }}
                    />
                  </div>
                  {loadingData ? (
                    <div className="h-3 w-20 bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
                  ) : (
                    <p className="text-[12px] font-bold text-[#7B1F35] dark:text-[#D05353]">
                      {progressPercent}% complete
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
                  {loadingData ? (
                    <div className="h-8 w-24 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-full" />
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold tracking-wide ${
                      missingCount === 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                    }`}>
                      {missingCount === 0 ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          All Complete
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {missingCount} missing
                        </>
                      )}
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* DOCUMENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {requirements.map((item) => {
                const meta = documentsMeta[item.id] || documentsMeta[item.title];
                const isUploaded = !!(meta && (meta.url || meta.name));
                const isUploadingThis = uploadingItem === item.id;

                if (isUploaded && meta) {
                  // ── SUBMITTED CARD ──
                  const hasRevision = !!documentRevisions[item.id] && !documentResubmissions[item.id];
                  return (
                    <Card key={item.id} hover className={`flex flex-col h-full ${isUploadingThis ? 'opacity-70 pointer-events-none' : ''}`}>
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
                                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold rounded-lg border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200/60 transition-colors touch-manipulation"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  View Revision Notes
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-auto">
                          {hasRevision ? (
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" /> Revision Required
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 dark:text-green-400">
                              <span className="w-2 h-2 bg-green-500 rounded-full" /> Submitted
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-[12px] font-bold">
                            {isUploadingThis ? (
                              <div className="flex items-center gap-1.5 text-[#7B1F35] dark:text-[#D05353]">
                                <div className="w-3.5 h-3.5 border-2 border-[#7B1F35]/30 dark:border-[#D05353]/30 border-t-[#7B1F35] dark:border-t-[#D05353] rounded-full animate-spin" />
                                <span>Uploading...</span>
                              </div>
                            ) : (
                                <>
                                  {reviewStatus !== 'published' && (
                                    <>
                                      <button
                                        className="min-h-[36px] py-1.5 px-3 rounded-lg bg-stone-100 dark:bg-stone-800 text-[#7B1F35] dark:text-[#D05353] hover:underline font-bold text-xs touch-manipulation"
                                        onClick={() => {
                                          if (item.type === 'url') handleUploadUrl(item);
                                          else fileInputRefs.current[item.id]?.click();
                                        }}
                                      >
                                        Replace
                                      </button>
                                      <button 
                                        className="min-h-[36px] py-1.5 px-3 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-red-500 hover:underline font-bold text-xs touch-manipulation" 
                                        onClick={() => handleDelete(item)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </>
                            )}
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
                const isSuspended = item.storageEnabled === false || item.storageStatus === 'suspended';

                return (
                  <Card key={item.id} hover className={`flex flex-col h-full ${isUploadingThis ? 'opacity-70 pointer-events-none' : ''}`}>
                    <div className={`absolute top-0 left-0 right-0 h-[3px] ${isSuspended ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-500 to-red-400'}`} />
                    <CardBody className="flex flex-col flex-1 pt-7">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${isSuspended ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] dark:text-stone-100 text-[15px]">{item.title}</h4>
                          {isSuspended ? (
                            <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 tracking-widest uppercase bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                              ⚠️ Uploads Paused by Admin
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-red-600 dark:text-red-400 tracking-widest uppercase bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-stone-500 dark:text-stone-400 text-[13px] mb-4 flex-1">{item.desc}</p>

                      <div
                        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all mt-auto ${
                          isSuspended 
                            ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 cursor-not-allowed'
                            : reviewStatus === 'published' 
                            ? 'border-red-300/60 dark:border-red-800/50 bg-red-50/40 dark:bg-red-950/20 opacity-60 cursor-not-allowed' 
                            : 'border-red-300/60 dark:border-red-800/50 bg-red-50/40 dark:bg-red-950/20 cursor-pointer hover:bg-red-50/80 dark:hover:bg-red-900/20'
                        }`}
                        onClick={() => {
                          if (isSuspended) {
                            Swal.fire({
                              icon: 'info',
                              title: 'Storage Allocation Paused',
                              text: `Uploads for "${item.title}" are temporarily suspended by the System Administrator to manage institutional cloud storage.`,
                              confirmButtonColor: '#801e38'
                            });
                            return;
                          }
                          if (reviewStatus === 'published') {
                            Swal.fire('Locked', 'This research is already published. No further changes can be made.', 'info');
                            return;
                          }
                          if (item.type === 'url') handleUploadUrl(item);
                          else fileInputRefs.current[item.id]?.click();
                        }}
                      >
                        {isUploadingThis ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                            <span className="text-red-500 font-bold text-[12px]">Uploading...</span>
                          </div>
                        ) : isSuspended ? (
                          <>
                            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-700 dark:text-amber-300 flex items-center justify-center mb-2 font-bold text-sm">
                              🔒
                            </div>
                            <p className="text-amber-800 dark:text-amber-300 font-bold text-[13px]">
                              Submissions Temporarily Paused
                            </p>
                            <p className="text-amber-700/80 dark:text-amber-400/80 text-[11px] mt-1">
                              Cloud storage allocation suspended by Admin
                            </p>
                          </>
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
                      {!isSuspended && (
                        <input
                          type="file"
                          accept={isPdfOnly(item) ? ".pdf" : ".pdf,.zip,video/*,.docx,image/*"}
                          ref={el => fileInputRefs.current[item.id] = el}
                          className="hidden"
                          onChange={(e) => handleUploadFile(item, e.target.files[0])}
                        />
                      )}
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
        initialAnnotations={documentAnnotations[viewerState.reqId] || {}}
      />
    </div>
  );
}
