import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth, storage } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';
import { Card, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import DocumentViewerModal from '../../components/DocumentViewerModal';

export default function ManuscriptPage({ onLogout, activeTab, setActiveTab, studentName, initials, profilePhotoUrl, role, leaderUid }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [studentData, setStudentData] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [extractingKeywords, setExtractingKeywords] = useState(false);
  const [viewerState, setViewerState] = useState({ isOpen: false, url: '', title: '' });
  const [documentResubmissions, setDocumentResubmissions] = useState({});

  const handleOpenViewer = async () => {
    if (!hasManuscript) return;
    
    let finalUrl = manuscript.url;
    if (finalUrl && !finalUrl.startsWith('http')) {
      try {
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          title: 'Loading document...',
          showConfirmButton: false,
          didOpen: () => Swal.showLoading()
        });
        const storageRef = ref(storage, finalUrl);
        finalUrl = await getDownloadURL(storageRef);
        Swal.close();
      } catch (err) {
        console.error("Failed to fetch document URL:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load document. It may have been deleted.' });
        return;
      }
    }
    
    setViewerState({ isOpen: true, url: finalUrl, title: manuscript.name || 'Final Manuscript' });
  };

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
        const latestSub = subs[0];
        setSubmission(latestSub);
        setSubmissionId(latestSub.id);
        setDocumentResubmissions(latestSub.documentResubmissions || {});
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
  const isPublished = submission?.reviewStatus === 'published';
  
  const hasRevision = !!submission?.documentRevisions?.['Final Manuscript'] && !documentResubmissions?.['Final Manuscript'];
  const revisionNote = submission?.documentRevisions?.['Final Manuscript'];

  const researchTitle = studentData?.researchTitle || submission?.title || 'Research Title';
  const groupName = studentData?.groupName || submission?.groupName || 'Your Group';
  const members = studentData?.groupMembers || [];
  
  const abstract = submission?.abstract || 'No abstract provided. Click Edit to add an abstract.';
  const pageCount = submission?.pageCount || '0';
  const keywords = submission?.keywords || [];

  // AI Keyword Extraction
  const handleExtractKeywords = async () => {
    const currentAbstract = submission?.abstract;
    if (!currentAbstract || currentAbstract === 'No abstract provided. Click Edit to add an abstract.' || currentAbstract.trim().length < 20) {
      Swal.fire({ icon: 'info', title: 'No Abstract', text: 'Please add an abstract first before extracting keywords.', confirmButtonColor: '#7B1F35' });
      return;
    }
    
    setExtractingKeywords(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
      const res = await fetch(`${backendUrl}/api/ai/extract-keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abstract: currentAbstract })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to extract keywords');
      }

      const data = await res.json();
      const parsedKeywords = data.keywords || [];

      if (parsedKeywords && parsedKeywords.length > 0) {
        // Save to Firestore
        await updateDoc(doc(db, 'submissions', submissionId), {
          keywords: parsedKeywords
        });
        Swal.fire({ icon: 'success', title: 'Keywords Updated!', text: `AI extracted ${parsedKeywords.length} keywords from your abstract.`, confirmButtonColor: '#7B1F35', timer: 2500, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'warning', title: 'No Keywords Found', text: 'AI could not extract keywords. Try editing your abstract.', confirmButtonColor: '#7B1F35' });
      }
    } catch (err) {
      console.error('Keyword extraction error:', err);
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Failed to extract keywords.', confirmButtonColor: '#7B1F35' });
    } finally {
      setExtractingKeywords(false);
    }
  };

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
        `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">` +
        `<span style="font-size: 14px; font-weight: bold; color: #1A1A1A;">Keywords (comma separated)</span>` +
        `<button type="button" id="ai-keywords-btn" style="background: linear-gradient(135deg, #7B1F35, #a32946); color: white; border: none; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">✨ AI Extract</button>` +
        `</div>` +
        `<input id="swal-keywords" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="e.g. AI, Health, Tech" value="${keywords.join(', ')}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#7B1F35',
      didOpen: () => {
        // Attach click handler to AI Extract button inside modal
        const aiBtn = document.getElementById('ai-keywords-btn');
        if (aiBtn) {
          aiBtn.addEventListener('click', async () => {
            const abstractText = document.getElementById('swal-abstract').value;
            if (!abstractText || abstractText.trim().length < 20) {
              Swal.showValidationMessage('Please enter an abstract first (at least 20 characters).');
              return;
            }
            aiBtn.disabled = true;
            aiBtn.innerHTML = '⏳ Extracting...';
            aiBtn.style.opacity = '0.7';
            try {
              const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
              const res = await fetch(`${backendUrl}/api/ai/extract-keywords`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ abstract: abstractText })
              });
              
              if (!res.ok) throw new Error('API Error');
              const data = await res.json();
              const parsedKeywords = data.keywords || [];
              
              if (parsedKeywords && parsedKeywords.length > 0) {
                document.getElementById('swal-keywords').value = parsedKeywords.join(', ');
                Swal.resetValidationMessage();
              }
            } catch (err) {
              console.error('AI extract error:', err);
              Swal.showValidationMessage('Failed to extract keywords. Try again.');
            } finally {
              aiBtn.disabled = false;
              aiBtn.innerHTML = '✨ AI Extract';
              aiBtn.style.opacity = '1';
            }
          });
        }
      },
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

  const runScan = async () => {
    Swal.fire({
      title: 'Running AI Scanner...',
      html: 'Evaluating grammar, tone, and readability...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
      const res = await fetch(`${backendUrl}/api/ai/precheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abstract })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to scan');

      if (submissionId) {
        await updateDoc(doc(db, 'submissions', submissionId), {
          aiScanResult: data
        });
      }

      showResult(data);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Scan Failed', text: 'Could not reach the AI service.', confirmButtonColor: '#7B1F35' });
    }
  };

  const showResult = async (data) => {
    let currentAbstract = abstract;
    let color = '#1E8E3E'; // Green
    if (data.score < 80) color = '#D97706'; // Orange
    if (data.score < 60) color = '#DC2626'; // Red

    const suggestionsHtml = data.suggestions && data.suggestions.length > 0 
      ? `<ul class="text-left mt-4 text-[13px] text-gray-600 dark:text-stone-300 list-none p-0 overflow-y-auto pr-1" style="max-height: 280px;">
          ${data.suggestions.map((s, idx) => {
            if (typeof s === 'string') return `<li class="mb-2">• ${s}</li>`;
            
            const isApplied = !currentAbstract.includes(s.original) && currentAbstract.includes(s.suggested);
            const isNotFound = !currentAbstract.includes(s.original) && !currentAbstract.includes(s.suggested);
            
            let btnHtml = '';
            if (isApplied) {
              btnHtml = `<button class="apply-suggestion-btn" data-index="${idx}" disabled style="position: absolute; right: 10px; top: 10px; background: #1E8E3E; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: default;">Applied!</button>`;
            } else if (isNotFound) {
              btnHtml = `<button class="apply-suggestion-btn" data-index="${idx}" disabled style="position: absolute; right: 10px; top: 10px; background: #6b7280; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: default;">Not Found</button>`;
            } else {
              btnHtml = `<button class="apply-suggestion-btn" data-index="${idx}" style="position: absolute; right: 10px; top: 10px; background: #7B1F35; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; transition: background 0.2s;">Apply</button>`;
            }

            return `
            <li class="relative mb-3 bg-gray-50/80 dark:bg-stone-800/80 p-3 rounded-md border-l-4 border-[#D97706] shadow-sm">
              <div class="line-through text-red-600 dark:text-red-400 mb-1 pr-[60px]">"${s.original}"</div>
              <div class="text-green-700 dark:text-emerald-500 font-bold mb-1 pr-[60px]">"${s.suggested}"</div>
              <div class="text-[11px] text-gray-500 dark:text-stone-400 italic">Reason: ${s.reason}</div>
              ${btnHtml}
            </li>`;
          }).join('')}
         </ul>`
      : '<p class="text-left mt-4 text-[13px] text-gray-500 dark:text-stone-400">No major suggestions. Looks great!</p>';

    const isDark = document.documentElement.classList.contains('dark');
    const swalRes = await Swal.fire({
      title: `<span class="text-gray-800 dark:text-stone-100">AI Scanner Result</span>`,
      background: isDark ? '#1c1917' : '#ffffff',
      customClass: {
        popup: 'rounded-xl border border-gray-200 dark:border-stone-700/50 shadow-xl',
        htmlContainer: 'text-gray-600 dark:text-stone-300'
      },
      html: `
        <div class="text-[52px] font-bold mb-2" style="color: ${color};">${data.score}<span class="text-[24px] text-gray-400 dark:text-stone-600">/100</span></div>
        <p class="text-[14px] font-bold text-gray-700 dark:text-stone-200">${data.feedback}</p>
        <hr class="my-4 border-gray-100 dark:border-stone-800">
        <div class="text-left font-bold text-[14px] text-gray-800 dark:text-stone-100">Suggestions:</div>
        ${suggestionsHtml}
      `,
      showCancelButton: true,
      confirmButtonColor: '#7B1F35',
      confirmButtonText: 'Got it!',
      cancelButtonColor: '#D97706',
      cancelButtonText: 'Try Again',
      didOpen: () => {
        const btns = document.querySelectorAll('.apply-suggestion-btn');
        btns.forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const idx = e.target.getAttribute('data-index');
            const suggestion = data.suggestions[idx];
            
            if (suggestion && suggestion.original && suggestion.suggested) {
              if (currentAbstract.includes(suggestion.original)) {
                currentAbstract = currentAbstract.replace(suggestion.original, suggestion.suggested);
                e.target.innerText = 'Applied!';
                e.target.style.background = '#1E8E3E';
                e.target.disabled = true;

                if (submissionId) {
                  await updateDoc(doc(db, 'submissions', submissionId), { abstract: currentAbstract });
                }
              } else {
                e.target.innerText = 'Not Found';
                e.target.style.background = '#9ca3af';
                e.target.disabled = true;
              }
            }
          });
        });
      }
    });

    if (swalRes.dismiss === Swal.DismissReason.cancel) {
      runScan();
    }
  };

  const handleAIPreCheck = async () => {
    if (!abstract || abstract.includes('No abstract')) {
      Swal.fire({ icon: 'error', title: 'No Abstract', text: 'Please add your abstract first before running the AI Scanner.', confirmButtonColor: '#7B1F35' });
      return;
    }

    if (submission?.aiScanResult) {
      showResult(submission.aiScanResult);
    } else {
      runScan();
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f5f0e6] dark:bg-stone-950 font-sans overflow-hidden transition-colors">
      
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
            <div className="w-full bg-gradient-to-br from-[#7B1F35] to-[#5a1831] rounded-2xl p-8 flex items-center justify-between relative overflow-hidden shadow-md border border-[#7B1F35]/20 transition-colors">
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
              <Card hover className="lg:col-span-5 p-8 flex flex-col">
                <p className="text-[11px] font-bold text-gray-500 dark:text-stone-400 tracking-widest uppercase mb-6">Current File</p>
                
                {/* PDF Thumbnail Mockup */}
                <div 
                  onClick={handleOpenViewer}
                  className={`bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/50 rounded-lg p-6 flex flex-col items-center text-center mb-6 shadow-sm relative ${hasManuscript ? 'cursor-pointer hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600 transition-all' : ''}`}
                >
                  <div className="w-full bg-[#7B1F35] dark:bg-stone-950/50 rounded-t-lg absolute top-0 left-0 h-12 flex items-center justify-center">
                    <p className="text-white/80 text-[8px] tracking-widest uppercase">Southwestern University</p>
                  </div>
                  <div className="mt-12 w-full">
                    <h4 className="font-serif font-bold text-[#7B1F35] dark:text-[#D05353] text-[16px] mb-2 leading-tight uppercase px-4 truncate">{researchTitle}</h4>
                    <p className="text-gray-400 dark:text-stone-500 text-[10px] mb-1">A Capstone Research</p>
                    <p className="text-[#CF3645] dark:text-red-400 text-[11px] font-bold mb-6">{groupName}</p>
                    {/* Mock text lines */}
                    <div className="flex flex-col gap-1.5 w-[80%] mx-auto mb-4">
                      <div className="h-1 bg-[#E8DFCB] dark:bg-stone-700 rounded-full w-full"></div>
                      <div className="h-1 bg-[#E8DFCB] dark:bg-stone-700 rounded-full w-[90%] mx-auto"></div>
                      <div className="h-1 bg-[#E8DFCB] dark:bg-stone-700 rounded-full w-[95%] mx-auto"></div>
                      <div className="h-1 bg-[#E8DFCB] dark:bg-stone-700 rounded-full w-[85%] mx-auto"></div>
                    </div>
                    <p className="text-gray-400 dark:text-stone-500 text-[8px]">Page 1 of {pageCount}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-[#1A1A1A] dark:text-stone-100 text-[16px] truncate">{manuscript?.name || 'No file uploaded yet'}</h3>
                  {hasManuscript ? (
                    <p className="text-gray-500 dark:text-stone-400 text-[13px]">{manuscript.size} · {pageCount} pages · Updated {manuscript.date}</p>
                  ) : (
                    <p className="text-gray-500 dark:text-stone-400 text-[13px]">Upload your manuscript in the Requirements tab.</p>
                  )}
                </div>

                <div className="flex gap-3 mb-4">
                  <button 
                    onClick={handleOpenViewer}
                    disabled={!hasManuscript}
                    className={`flex-1 border border-stone-300 dark:border-stone-700 text-[#1A1A1A] dark:text-stone-200 text-[13px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors ${hasManuscript ? 'hover:bg-stone-50 dark:hover:bg-stone-800' : 'opacity-50 cursor-not-allowed'}`}
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
                    className={`flex-1 border border-stone-300 dark:border-stone-700 text-[#1A1A1A] dark:text-stone-200 text-[13px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors ${hasManuscript ? 'hover:bg-stone-50 dark:hover:bg-stone-800' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>
                </div>
                
                {isPublished ? (
                  <div className="mt-4 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-bold rounded-lg border border-green-200 dark:border-green-800 text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Published
                  </div>
                ) : (
                  <PremiumButton onClick={() => setActiveTab('Requirements')} className="w-full mt-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    {hasManuscript ? 'Replace Manuscript' : 'Upload Manuscript'}
                  </PremiumButton>
                )}
              </Card>

              {/* RIGHT COLUMN: Research Details */}
              <Card hover className="lg:col-span-7 p-8 flex flex-col">
                <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-800 pb-4 mb-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 dark:text-stone-400 tracking-widest uppercase mb-1">Research Details</p>
                    <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A] dark:text-stone-100">Manuscript Information</h3>
                  </div>
                  {!isPublished && (
                    <button onClick={handleEditDetails} className="border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-[#1A1A1A] dark:text-stone-200 text-[12px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Edit
                    </button>
                  )}
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 tracking-widest uppercase mb-1">Research Title</p>
                  <h4 className="font-serif font-bold text-[18px] text-[#1A1A1A] dark:text-[#D05353]">{researchTitle}</h4>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 tracking-widest uppercase">Abstract</p>
                    <button onClick={handleAIPreCheck} className="text-[#1A1A1A] dark:text-stone-200 hover:text-[#7B1F35] dark:hover:text-[#7B1F35] hover:bg-stone-200 dark:hover:bg-stone-700 text-[10px] font-bold tracking-widest uppercase bg-stone-100 dark:bg-stone-800 px-2 py-1.5 rounded shadow-sm border border-stone-200 dark:border-stone-700 transition-colors flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#7B1F35] dark:text-[#D05353]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      AI Pre-Check
                    </button>
                  </div>
                  <p className={`text-[14px] leading-relaxed ${abstract.includes('No abstract') ? 'text-gray-400 dark:text-stone-500 italic' : 'text-gray-600 dark:text-stone-300'}`}>
                    {abstract}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 tracking-widest uppercase mb-1">Authors</p>
                    <p className="text-[#1A1A1A] dark:text-stone-200 font-bold text-[14px]">{members.length + 1} group member{members.length + 1 !== 1 ? 's' : ''}</p>
                    <p className="text-gray-500 dark:text-stone-400 text-[12px] mt-0.5 truncate">
                      {[studentData?.firstName?.charAt(0) + '. ' + studentData?.lastName, ...members.map(m => typeof m === 'object' ? m.name : m.split('@')[0])].join(' · ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 tracking-widest uppercase mb-1">Pages</p>
                    <p className="text-[#1A1A1A] dark:text-stone-200 font-bold text-[14px]">{pageCount} pages</p>
                    <p className="text-gray-500 dark:text-stone-400 text-[12px] mt-0.5">Including references & appendices</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 tracking-widest uppercase">Keywords</p>
                    {submissionId && (
                      <button
                        onClick={handleExtractKeywords}
                        disabled={extractingKeywords}
                        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#7B1F35] dark:from-[#f8d070] to-[#a32946] dark:to-yellow-500 text-white dark:text-white text-[11px] font-bold rounded-full hover:shadow-md transition-all disabled:opacity-60"
                      >
                        {extractingKeywords ? (
                          <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Extracting...</>
                        ) : (
                          <>✨ AI Generate</>  
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.length > 0 ? keywords.map((tag, idx) => (
                      <span key={idx} className="border border-[#DDA3B6] dark:border-yellow-600/50 text-[#7B1F35] dark:text-yellow-600 bg-[#F9EBF0] dark:bg-yellow-600/10 px-3 py-1 rounded-full text-[12px] font-bold">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-gray-400 dark:text-stone-500 text-[12px] italic">No keywords added</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* VERSION HISTORY */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-stone-400 tracking-widest uppercase mb-1">Version History</p>
                  <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A] dark:text-stone-100">Previous Uploads</h3>
                </div>
                <p className="text-gray-500 dark:text-stone-400 text-[13px]">Older versions are kept for adviser reference</p>
              </div>

              <div className="flex flex-col gap-3">
                {hasManuscript ? (
                  <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="bg-[#7B1F35] dark:bg-[#7B1F35] text-white dark:text-white text-[12px] font-bold px-3 py-1 rounded-full">v1.0</span>
                      <span className="text-[#7B1F35] dark:text-[#D05353] font-bold text-[13px] flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-[#7B1F35] dark:bg-[#7B1F35] rounded-full"></span>
                        Current
                      </span>
                      <span className="text-gray-600 dark:text-stone-400 text-[13px] w-24">{manuscript.date}</span>
                      <span className="text-gray-500 dark:text-stone-400 text-[13px] w-16">{manuscript.size}</span>
                      <span className="text-gray-600 dark:text-stone-300 text-[13px] truncate flex-1">Initial upload</span>
                    </div>
                    <span className="text-gray-500 dark:text-stone-400 text-[12px] font-bold shrink-0">In use</span>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-stone-400 text-[13px] italic">No versions uploaded yet.</p>
                )}

              </div>
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
        initialNote={submission?.documentRevisions?.['Final Manuscript'] || ''}
        initialAnnotations={submission?.documentAnnotations?.['Final Manuscript'] || {}}
      />
    </div>
  );
}
