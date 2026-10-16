import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import TermsAndConditionsModal from './TermsAndConditionsModal';
import { normalizeDepartment } from '../utils/normalizeDepartment';

function Footer() {
  const [totalViews, setTotalViews] = useState(0);
  const [topDepartments, setTopDepartments] = useState([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyTab, setPolicyTab] = useState('terms');

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
        setTopDepartments(['Information Technology']);
      } else {
        setTopDepartments(dynamicDepts.slice(0, 6));
      }
    });

    return () => unsubscribe();
  }, []);

  const openPolicy = (tab) => {
    setPolicyTab(tab);
    setShowPolicyModal(true);
  };

  return (
    <footer className="bg-[#1a050d] text-stone-400 pt-10 pb-6 px-6 md:px-16 font-sans text-[11px] border-t-4 border-[#3d0c1b] relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7a2039]/10 blur-3xl rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* TOP SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-[#f3e5ab] text-xl font-serif font-bold tracking-widest mb-1">
              ARCHIVIO
            </h2>
            <p className="mb-0.5 text-stone-300 font-medium">Research Archive Management System</p>
            <p className="mb-1 text-[#f3e5ab]/90 font-semibold text-xs">College of Information Technology</p>
            <p className="mb-3 text-stone-400">SWU PHINMA • Cebu City, Philippines</p>
            <p className="text-[10px] text-amber-200/70 italic font-medium">Powered by: College of Information Technology</p>
          </div>

          {/* Top Departments */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-[#8c7435] font-bold mb-3 tracking-widest uppercase text-[9px]">Top Departments</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 w-full max-w-[260px] mx-auto md:mx-0">
              {topDepartments.map((deptName) => (
                <Link 
                  key={deptName} 
                  to="/browse" 
                  state={{ dept: deptName }} 
                  className="hover:text-[#f3e5ab] transition flex items-center gap-1.5 group truncate"
                  title={deptName}
                >
                  <span className="text-stone-600 group-hover:text-[#7a2039] transition">›</span>
                  <span className="truncate">{deptName}</span>
                </Link>
              ))}
              <Link to="/browse" className="hover:text-amber-200 transition flex items-center gap-1.5 text-stone-500 hover:underline">
                View All
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="text-[#8c7435] font-bold mb-3 tracking-widest uppercase text-[9px]">Quick Links &amp; Policies</h3>
            <div className="flex flex-row md:flex-col flex-wrap justify-center gap-4 md:gap-2 md:items-end">
              <Link to="/" className="hover:text-white transition">Home</Link>
              <Link to="/browse" className="hover:text-white transition">Browse</Link>
              <Link to="/about" className="hover:text-white transition">About</Link>
              <button 
                type="button" 
                onClick={() => openPolicy('terms')} 
                className="hover:text-[#f3e5ab] transition cursor-pointer text-left md:text-right"
              >
                Terms of Use
              </button>
              <button 
                type="button" 
                onClick={() => openPolicy('privacy')} 
                className="hover:text-[#f3e5ab] transition cursor-pointer text-left md:text-right"
              >
                Privacy Policy
              </button>
            </div>
          </div>

        </div>

        {/* DIVIDER */}
        <div className="border-t border-white/5 mb-5"></div>

        {/* BOTTOM BAR */}
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-3">
          {/* Views */}
          <div className="bg-black/30 px-3 py-1.5 rounded flex items-center gap-2 border border-white/5">
            <svg className="w-3.5 h-3.5 text-stone-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
            </svg>
            <span>Total Archive Views: <strong className="text-white ml-1">{totalViews.toLocaleString()}</strong></span>
          </div>

          {/* Copyright & Legal Links */}
          <div className="text-center md:text-right">
            <p className="mb-0.5 text-[10px]">© {new Date().getFullYear()} SWU PHINMA • ARCHIVIO</p>
            <div className="flex items-center justify-center md:justify-end gap-2 text-[10px] text-stone-500">
              <button 
                type="button" 
                onClick={() => openPolicy('terms')} 
                className="hover:text-[#f3e5ab] transition cursor-pointer underline"
              >
                Terms and Conditions
              </button>
              <span>•</span>
              <button 
                type="button" 
                onClick={() => openPolicy('privacy')} 
                className="hover:text-[#f3e5ab] transition cursor-pointer underline"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <span className="text-stone-600">BSIT Capstone</span>
            </div>
          </div>
        </div>

      </div>

      {/* POLICY MODAL */}
      <TermsAndConditionsModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        initialTab={policyTab}
      />
    </footer>
  );
}

export default Footer;