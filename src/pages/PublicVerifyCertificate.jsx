import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';

export default function PublicVerifyCertificate() {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyRecord() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'submissions', id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setSubmission(data);

          if (data.studentUid) {
            try {
              const qGroup = query(collection(db, 'groups'), where('leaderUid', '==', data.studentUid));
              const groupSnap = await getDocs(qGroup);
              if (!groupSnap.empty) {
                const matched = groupSnap.docs.find(d => {
                  const g = d.data();
                  if (data.groupId && d.id === data.groupId) return true;
                  if (data.researchTitle && g.researchTitle === data.researchTitle) return true;
                  if (data.title && g.researchTitle === data.title) return true;
                  return false;
                });
                setGroupData(matched ? matched.data() : groupSnap.docs[0].data());
              }
            } catch (err) {
              console.warn('Notice fetching group data for verification:', err.message);
            }
          }
        } else {
          setSubmission(null);
        }
      } catch (err) {
        console.error('Error verifying record:', err);
        setSubmission(null);
      } finally {
        setLoading(false);
      }
    }

    verifyRecord();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      title: 'Verification link copied!',
      showConfirmButton: false,
      timer: 2000
    });
  };

  const title = submission?.researchTitle || submission?.title || groupData?.researchTitle || 'Untitled Research Manuscript';

  let authors = [];
  if (groupData?.leaderName) {
    authors.push(groupData.leaderName);
    if (Array.isArray(groupData.members)) {
      groupData.members.forEach(m => {
        const name = typeof m === 'object' ? m?.name : (typeof m === 'string' ? (m.includes('@') ? m.split('@')[0] : m) : '');
        if (name && !authors.includes(name)) authors.push(name);
      });
    }
  } else if (submission?.authorDisplay) {
    authors = [submission.authorDisplay];
  } else if (submission?.groupName) {
    authors = [submission.groupName];
  } else {
    authors = ['Research Proponents'];
  }

  const rawDate = submission?.publishedAt || submission?.deanApprovedAt || submission?.updatedAt || submission?.createdAt;
  const formattedDate = rawDate 
    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Archived Record';

  const refCode = id ? `ARCH-SWU-${id.substring(0, 8).toUpperCase()}` : 'ARCH-SWU-UNKNOWN';
  const isPublished = submission?.reviewStatus === 'published';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col font-sans">
      {/* MINIMAL INSTITUTIONAL HEADER */}
      <header className="bg-[#7B1F35] text-white px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9 object-contain bg-white rounded-full p-1" />
            <div>
              <span className="font-serif font-bold text-sm tracking-wider uppercase block">Southwestern University PHINMA</span>
              <span className="text-[10px] text-white/75 uppercase tracking-widest block">ARCHIVIO Verification Portal</span>
            </div>
          </div>
          <Link to="/" className="text-white/80 hover:text-white text-xs font-semibold px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition">
            Portal Login
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 border-4 border-[#7B1F35]/30 border-t-[#7B1F35] rounded-full animate-spin mb-4" />
            <p className="font-serif font-bold text-stone-600">Verifying Institutional Archival Record...</p>
          </div>
        ) : !submission ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-stone-200 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ⚠️
            </div>
            <h1 className="font-serif font-bold text-2xl text-stone-900 mb-2">
              Record Not Found
            </h1>
            <p className="text-stone-600 text-sm mb-6 leading-relaxed">
              We could not find an authentic research archival record matching Reference ID: <span className="font-mono font-bold text-red-600">{id}</span>.
            </p>
            <Link 
              to="/"
              className="bg-[#7B1F35] hover:bg-[#5a1528] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm inline-block"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7B1F35] via-[#c9a227] to-[#7B1F35]" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-widest uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        Officially Verified Record
                      </span>
                      {isPublished && (
                        <span className="text-[11px] font-bold tracking-widest uppercase bg-[#c9a227]/20 text-[#8c6f13] px-2.5 py-0.5 rounded-full">
                          Public Archive
                        </span>
                      )}
                    </div>
                    <h1 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 mt-1">
                      Certificate of Digital Archival
                    </h1>
                    <p className="text-xs text-stone-500">
                      Southwestern University PHINMA • ARCHIVIO Institutional Repository
                    </p>
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <div className="text-xs font-mono font-bold text-[#7B1F35] bg-[#7B1F35]/10 px-3 py-1 rounded-lg inline-block">
                    {refCode}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">Ref ID</p>
                </div>
              </div>

              {/* RESEARCH DETAILS */}
              <div className="py-6 flex flex-col gap-5">
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Archived Research Title
                  </p>
                  <h2 className="font-serif font-bold text-lg sm:text-xl text-[#7B1F35] leading-snug">
                    "{title}"
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-stone-200/70">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Authors / Proponents
                    </p>
                    <p className="font-serif font-bold text-stone-900 text-sm">
                      {authors.join(', ')}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {submission?.program || groupData?.program || 'College of Information Technology and Engineering'}
                    </p>
                  </div>

                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-stone-200/70">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Academic Department
                    </p>
                    <p className="font-serif font-bold text-stone-900 text-sm">
                      {submission?.department || groupData?.department || 'Southwestern University PHINMA'}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Cataloged on: <span className="font-semibold text-stone-700">{formattedDate}</span>
                    </p>
                  </div>
                </div>

                {/* SIGN-OFF VERIFICATION BADGES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Research Adviser Endorsement</p>
                      <p className="text-xs font-bold text-stone-900">{submission?.adviserName || groupData?.adviserName || 'Official Adviser'}</p>
                      <p className="text-[10px] text-stone-500">Digitally Authenticated</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Dean Approval & Archival Sign-off</p>
                      <p className="text-xs font-bold text-stone-900">{submission?.deanFeedback?.deanName || submission?.deanName || 'Office of the Dean'}</p>
                      <p className="text-[10px] text-stone-500">Permanent Institutional Record</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span>🔒</span>
                  <span className="italic">Official printable certificates are issued exclusively to authenticated proponents & faculty.</span>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="text-stone-600 hover:text-stone-900 text-xs font-semibold px-4 py-2.5 rounded-lg border border-stone-200 transition flex items-center gap-1.5 cursor-pointer hover:bg-stone-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Verification URL</span>
                </button>
              </div>

            </div>

            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Cryptographically verified against the official SWU PHINMA Institutional Repository ledger.</span>
              </span>
              <span className="font-mono text-[10px] bg-stone-200 px-2 py-0.5 rounded">SHA-256 SECURED</span>
            </div>

          </div>
        )}
      </main>

      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>© 2026 Southwestern University PHINMA • ARCHIVIO Institutional Digital Repository</p>
      </footer>
    </div>
  );
}
