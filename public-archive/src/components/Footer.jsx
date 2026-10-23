import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import TermsAndConditionsModal from './TermsAndConditionsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import { normalizeDepartment } from '../utils/normalizeDepartment';

function Footer() {
  const [totalViews, setTotalViews] = useState(0);
  const [topDepartments, setTopDepartments] = useState([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    const qSubs = query(collection(db, 'submissions'), where('reviewStatus', '==', 'published'));
    
    const unsubscribe = onSnapshot(qSubs, (snapshot) => {
      let views = 0;
      const deptCounts = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        views += (data.views || 0);
        const rawDept = data.department || data.program || data.category;
        if (rawDept && typeof rawDept === 'string' && rawDept.trim()) {
          const norm = normalizeDepartment(rawDept);
          deptCounts[norm] = (deptCounts[norm] || 0) + 1;
        }
      });
      setTotalViews(views);

      const dynamicDepts = Object.keys(deptCounts)
        .sort((a, b) => deptCounts[b] - deptCounts[a]);

      if (dynamicDepts.length === 0) {
        setTopDepartments([]);
      } else {
        setTopDepartments(dynamicDepts.slice(0, 6));
      }
    });

    return () => unsubscribe();
  }, []);

  const openTerms = () => setShowTermsModal(true);
  const openPrivacy = () => setShowPrivacyModal(true);

  return (
    <footer className="bg-[#14030a] text-stone-300 pt-8 pb-6 px-6 md:px-16 font-sans text-xs border-t-4 border-[#3d0c1b] relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#7a2039]/15 blur-3xl rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* TOP SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mb-6">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-[#f3e5ab] text-lg lg:text-xl font-serif font-bold tracking-widest mb-1 drop-shadow-sm">
              ARCHIVIO
            </h2>
            <p className="mb-0.5 text-stone-200 font-medium text-[11px] md:text-xs">Research Archive Management System</p>
            <p className="mb-0.5 text-[#f3e5ab] font-semibold text-[11px]">College of Information Technology</p>
            <p className="mb-2.5 text-stone-300 text-[10px] md:text-[11px]">SWU PHINMA • Cebu City, Philippines</p>
            <div className="inline-flex items-center gap-1.5 bg-[#250712] border border-[#521326] px-2.5 py-1 rounded-md text-[9.5px] md:text-[10px] text-amber-200/90 italic font-medium shadow-inner">
              <span>Powered by: College of Information Technology</span>
            </div>
          </div>

          {/* Top Departments */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-[#d6ad60] font-bold mb-3 tracking-widest uppercase text-[10px] md:text-[11px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d6ad60]"></span>
              Top Departments
            </h3>
            {topDepartments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 w-full max-w-sm mx-auto md:mx-0">
                {topDepartments.map((deptName) => (
                  <Link 
                    key={deptName} 
                    to="/browse" 
                    state={{ dept: deptName }} 
                    className="text-stone-300 hover:text-[#f3e5ab] transition-colors flex items-center gap-1.5 group truncate text-[10px] md:text-[11px] font-medium py-0.5"
                    title={deptName}
                  >
                    <span className="text-stone-500 group-hover:text-[#f3e5ab] group-hover:translate-x-0.5 transition-all text-[11px] font-bold">›</span>
                    <span className="truncate">{deptName}</span>
                  </Link>
                ))}
                <Link to="/browse" className="text-amber-300 hover:text-amber-100 transition-colors flex items-center gap-1 text-[10px] md:text-[11px] font-semibold underline-offset-4 hover:underline pt-0.5">
                  View All Departments →
                </Link>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="text-[#d6ad60] font-bold mb-3 tracking-widest uppercase text-[10px] md:text-[11px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d6ad60]"></span>
              Quick Links &amp; Policies
            </h3>
            <div className="flex flex-row md:flex-col flex-wrap justify-center gap-3 md:gap-1.5 md:items-end text-[10px] md:text-[11px] font-medium">
              <Link to="/" className="text-stone-300 hover:text-[#f3e5ab] transition-colors py-0.5">Home</Link>
              <Link to="/browse" className="text-stone-300 hover:text-[#f3e5ab] transition-colors py-0.5">Browse</Link>
              <Link to="/about" className="text-stone-300 hover:text-[#f3e5ab] transition-colors py-0.5">About</Link>
              <button 
                type="button" 
                onClick={openTerms} 
                className="text-stone-300 hover:text-[#f3e5ab] transition-colors cursor-pointer text-left md:text-right py-0.5"
              >
                Terms of Use
              </button>
              <button 
                type="button" 
                onClick={openPrivacy} 
                className="text-stone-300 hover:text-[#f3e5ab] transition-colors cursor-pointer text-left md:text-right py-0.5"
              >
                Privacy Policy
              </button>
            </div>
          </div>

        </div>

        {/* DIVIDER */}
        <div className="border-t border-white/10 mb-4"></div>

        {/* BOTTOM BAR */}
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-3">
          {/* Views */}
          <div className="bg-black/40 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 shadow-sm text-[10px] md:text-[11px] text-stone-200">
            <svg className="w-3.5 h-3.5 text-amber-300/80 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
            </svg>
            <span>Total Archive Views: <strong className="text-white font-bold ml-1 tracking-wide">{totalViews.toLocaleString()}</strong></span>
          </div>

          {/* Copyright & Legal Links */}
          <div className="text-center md:text-right">
            <p className="mb-0.5 text-[10px] md:text-[11px] text-stone-300 font-medium">© {new Date().getFullYear()} SWU PHINMA • ARCHIVIO</p>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 text-[10px] md:text-[11px] text-stone-400">
              <button 
                type="button" 
                onClick={openTerms} 
                className="hover:text-[#f3e5ab] hover:underline underline-offset-4 transition cursor-pointer font-medium"
              >
                Terms and Conditions
              </button>
              <span className="text-stone-600">•</span>
              <button 
                type="button" 
                onClick={openPrivacy} 
                className="hover:text-[#f3e5ab] hover:underline underline-offset-4 transition cursor-pointer font-medium"
              >
                Privacy Policy
              </button>
              <span className="text-stone-600">•</span>
              <span className="text-stone-400 font-medium">BSIT Capstone</span>
            </div>
          </div>
        </div>

      </div>

      {/* SEPARATE DESIGNATED MODALS (NO TABS) */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </footer>
  );
}

export default Footer;