import React, { useState } from 'react';
import swuLogoSeal from '../assets/new icon.png';
import parchmentBg from '../assets/parchment.jpg';

export default function StudentSignup({ onSwitchPage }) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const [form, setForm] = useState({
    firstName: 'Juan',
    middleName: 'Carlos',
    lastName: 'Reyes',
    studentNumber: '20-2222-001',
    schoolEmail: 'jcreyes.swu@phinmaed.com', 
    course: '',
    yearLevel: '',
    groupName: '', 
    researchTitle: '',
    password: '',
    confirmPassword: '',
  });

  const [teamMembers, setTeamMembers] = useState([
    { id: 2, name: 'Maria Cristina Lim', email: 'mclim.swu@phinmaed.com', studentNumber: '' },
    { id: 3, name: 'Roberto Diaz Jr.', email: 'rdiaz.swu@phinmaed.com', studentNumber: '' },
    { id: 4, name: 'Joshua Miguel Mendoza', email: 'jmendoza.swu@phinmaed.com', studentNumber: '20-2222-004' },
  ]);

  const [verificationCode, setVerificationCode] = useState(['7', '2', '9', '', '', '']);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    const updated = [...verificationCode];
    updated[index] = value;
    setVerificationCode(updated);
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const removeMember = (id) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  // Step Validation Controls
  const canContinueStep1 = form.firstName && form.lastName && form.studentNumber && form.course && form.yearLevel;
  const canContinueStep2 = form.groupName && form.researchTitle;
  const canCompleteSignup = form.password && (form.password === form.confirmPassword) && isEmailVerified && agreedToTerms;

  // Custom Horizontal Step Navigation Timeline
  const StepIndicator = () => {
    const steps = [
      { id: 1, label: 'Personal Info' },
      { id: 2, label: 'Group Info' },
      { id: 3, label: 'Account Security' }
    ];

    return (
      <div className="w-full max-w-[520px] mx-auto mb-10 relative select-none">
        {/* Connecting Timeline Line */}
        <div className="absolute top-[18px] left-[40px] right-[40px] h-[3px] bg-[#E2D9C2] z-0" />
        <div 
          className="absolute top-[18px] left-[40px] h-[3px] bg-[#6B0F1A] z-0 transition-all duration-500"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        />
        
        <div className="flex justify-between relative z-10">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex flex-col items-center w-[100px]">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-sans font-bold transition-all duration-300 shadow-sm ${isActive || isDone ? 'bg-[#6B0F1A] text-white' : 'bg-[#D6CBB3] text-[#7A6E57]'}`}>
                  {isDone ? '✓' : s.id}
                </div>
                <span className={`text-[11px] font-sans font-bold tracking-wide mt-2 whitespace-nowrap ${isActive || isDone ? 'text-[#6B0F1A]' : 'text-[#8A7D63]'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Diamond Divider Ornament
  const DiamondDivider = () => (
    <div className="flex items-center justify-center gap-3 w-full my-4 pointer-events-none">
      <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-[#CCBFA3]" />
      <div className="w-1.5 h-1.5 rotate-45 bg-[#6B0F1A]" />
      <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-[#CCBFA3]" />
    </div>
  );

  return (
    <div 
      className="w-full min-h-screen bg-cover bg-center font-serif flex flex-col items-center py-10 px-4 select-text selection:bg-[#6B0F1A]/10 relative"
      style={{ backgroundImage: `url(${parchmentBg})` }}
    >
      {/* INSTITUTIONAL TOP HEADER */}
      <div className="flex items-center justify-center mb-8 gap-4 bg-transparent">
        <div className="w-[58px] h-[58px] rounded-full border-2 border-[#6B0F1A] p-0.5 bg-white shadow-sm flex items-center justify-center">
          <img src={swuLogoSeal} alt="SWU Logo" className="w-[44px] h-[44px] object-contain" />
        </div>
        <h1 className="text-[22px] sm:text-[24px] text-[#590C15] font-serif font-medium tracking-wide">
          Research Archive Management System
        </h1>
      </div>

      {/* CENTRALIZED REGISTRATION WIDGET */}
      <div className="w-full max-w-[700px] bg-[#FAF5EB] rounded-[28px] py-10 px-6 sm:px-14 shadow-[0_12px_40px_rgba(0,0,0,0.05)] border border-[#E4DBC4] mb-6 transition-all duration-300">
        
        <StepIndicator />

        {/* ── STEP 1: PERSONAL INFORMATION ── */}
        {step === 1 && (
          <div className="flex flex-col items-center transition-all">
            <h2 className="text-[30px] font-bold text-[#590C15] text-center font-serif tracking-tight">Personal Information</h2>
            <p className="text-[13px] text-[#7A6E57] font-sans text-center mt-0.5">Please provide your details to continue</p>
            
            <DiamondDivider />

            <div className="w-full mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                    <span className="text-[#A31D24] mr-1">*</span>First Name
                  </label>
                  <input className="w-full py-3 px-5 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" placeholder="Juan" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                    Middle Name
                  </label>
                  <input className="w-full py-3 px-5 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" placeholder="Carlos" value={form.middleName} onChange={e => handleChange('middleName', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                    <span className="text-[#A31D24] mr-1">*</span>Last Name
                  </label>
                  <input className="w-full py-3 px-5 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" placeholder="Reyes" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                    <span className="text-[#A31D24] mr-1">*</span>Student Number
                  </label>
                  <input className="w-full py-3 px-5 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" placeholder="20-2222-001" value={form.studentNumber} onChange={e => handleChange('studentNumber', e.target.value)} />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                  <span className="text-[#A31D24] mr-1">*</span>School Email
                </label>
                <div className="relative">
                  <input disabled className="w-full py-3 pl-5 pr-12 bg-[#EFE9DA] border border-[#C4B79A] rounded-full text-[13.5px] font-sans text-[#6B604A] font-medium outline-none cursor-not-allowed" value={form.schoolEmail} />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9E9075]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                </div>
                <p className="text-[11px] text-[#8C7F65] font-sans mt-1.5 pl-2">Pre-filled from your invitation link</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mb-10">
                <div className="relative">
                  <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                    <span className="text-[#A31D24] mr-1">*</span>Course
                  </label>
                  <select
                    value={form.course}
                    onChange={e => handleChange('course', e.target.value)}
                    className="w-full py-3 px-5 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none appearance-none focus:border-[#6B0F1A] focus:bg-white transition-all cursor-pointer shadow-inner"
                  >
                    <option value="" disabled>Select your course</option>
                    <option value="cs">Computer Science</option>
                    <option value="it">Information Technology</option>
                    <option value="is">Information Systems</option>
                  </select>
                  <div className="absolute right-5 bottom-[14px] pointer-events-none text-[#9E9075] text-[10px]">▼</div>
                </div>
                <div className="relative">
                  <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                    <span className="text-[#A31D24] mr-1">*</span>Year Level
                  </label>
                  <select
                    value={form.yearLevel}
                    onChange={e => handleChange('yearLevel', e.target.value)}
                    className="w-full py-3 px-5 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none appearance-none focus:border-[#6B0F1A] focus:bg-white transition-all cursor-pointer shadow-inner"
                  >
                    <option value="" disabled>Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                  <div className="absolute right-5 bottom-[14px] pointer-events-none text-[#9E9075] text-[10px]">▼</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => onSwitchPage('login')} 
                  className="flex-1 py-3.5 rounded-full text-[14px] font-sans font-bold flex items-center justify-center gap-1.5 bg-transparent border border-[#CCBFA3] text-[#6B604A] hover:bg-[#EFE9DA] transition-colors"
                >
                  ‹ Back
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(2)} 
                  disabled={!canContinueStep1} 
                  className={`flex-1 py-3.5 rounded-full text-[14px] font-sans font-bold flex items-center justify-center gap-1.5 transition-all ${!canContinueStep1 ? 'bg-[#C2BAA8] text-white cursor-not-allowed opacity-70' : 'bg-[#6B0F1A] text-white hover:bg-[#520A12] shadow-md cursor-pointer active:scale-[0.99]'}`}
                >
                  Continue ›
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: GROUP INFORMATION ── */}
        {step === 2 && (
          <div className="flex flex-col items-center transition-all">
            <h2 className="text-[30px] font-bold text-[#590C15] text-center font-serif tracking-tight">Group Information</h2>
            <p className="text-[13px] text-[#7A6E57] font-sans text-center mt-0.5">Tell us about your research group and team members</p>
            
            <DiamondDivider />

            <div className="w-full mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                  <span className="text-[#A31D24] mr-1">*</span>Group Name
                </label>
                <div className="relative">
                  <input className="w-full py-3 pl-5 pr-12 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" placeholder="e.g., Group HealthAI" value={form.groupName} onChange={e => handleChange('groupName', e.target.value)} />
                </div>
              </div>

              <div className="mb-2">
                <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                  <span className="text-[#A31D24] mr-1">*</span>Research Title
                </label>
                <div className="relative">
                  <input className="w-full py-3 pl-5 pr-12 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" placeholder="e.g., ML-Based Health Monitor" value={form.researchTitle} onChange={e => handleChange('researchTitle', e.target.value)} />
                </div>
              </div>

              <div className="mt-2 pl-1">
                <h3 className="text-[11px] font-sans font-bold uppercase text-[#590C15] tracking-wider">Team Members</h3>
                <p className="text-[11px] text-[#8C7F65] font-sans">Add your group members (you are the Leader)</p>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                
                {/* LEADER CARD */}
                <div className="w-full bg-[#EFE4C9] border border-[#D6C5A0] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#590C15] text-white flex items-center justify-center font-sans font-bold text-xs">JR</div>
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-sans font-bold text-[#3A2E15]">{form.firstName} {form.middleName} {form.lastName} (You)</span>
                      <span className="text-[11px] font-sans text-[#70644B]">{form.studentNumber} · {form.schoolEmail}</span>
                    </div>
                  </div>
                  <span className="bg-[#590C15] text-white text-[9px] font-sans font-extrabold px-3 py-1 rounded-full tracking-wider uppercase">Leader</span>
                </div>

                {/* MEMBER LISTING */}
                {teamMembers.map((member) => (
                  <div key={member.id} className="w-full bg-white/60 border border-[#E2D9C2] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EFE4C9] border border-[#D6C5A0] text-[#590C15] flex items-center justify-center font-sans font-bold text-sm">{member.id}</div>
                      <div className="flex flex-col">
                        <span className="text-[13.5px] font-sans font-semibold text-[#333]">{member.name}</span>
                        <span className="text-[11px] font-sans text-gray-500">{member.studentNumber ? `${member.studentNumber} · ` : ''}{member.email}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeMember(member.id)} className="text-gray-400 hover:text-[#590C15] bg-transparent border-none p-1 cursor-pointer transition-colors">
                      ✕
                    </button>
                  </div>
                ))}

              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-full text-[14px] font-sans font-bold flex items-center justify-center bg-[#6B0F1A] text-white hover:bg-[#520A12] shadow-md transition-all active:scale-[0.99]">‹ Back</button>
                <button type="button" onClick={() => setStep(3)} disabled={!canContinueStep2} className={`flex-1 py-3.5 rounded-full text-[14px] font-sans font-bold flex items-center justify-center transition-all ${!canContinueStep2 ? 'bg-[#C2BAA8] text-white cursor-not-allowed opacity-70' : 'bg-[#6B0F1A] text-white hover:bg-[#520A12] shadow-md cursor-pointer active:scale-[0.99]'}`}>Continue ›</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: ACCOUNT SECURITY ── */}
        {step === 3 && (
          <div className="flex flex-col items-center transition-all">
            <h2 className="text-[30px] font-bold text-[#590C15] text-center font-serif tracking-tight">Account Security</h2>
            <p className="text-[13px] text-[#7A6E57] font-sans text-center mt-0.5">Set your password and verify your email</p>
            
            <DiamondDivider />

            <div className="w-full mt-4 flex flex-col gap-4">
              {/* Password */}
              <div>
                <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                  <span className="text-[#A31D24] mr-1">*</span>Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    className="w-full py-3 pl-5 pr-12 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" 
                    placeholder="Enter a strong password" 
                    value={form.password} 
                    onChange={e => handleChange('password', e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#9E9075] hover:text-[#590C15] cursor-pointer p-0 text-[16px]"
                  >
                    👁
                  </button>
                </div>
                <div className="mt-2 px-1">
                  <div className="w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C29D4C] rounded-full transition-all duration-300" style={{ width: form.password.length > 5 ? '100%' : '30%' }} />
                  </div>
                  <span className="text-[10px] font-sans font-bold text-[#C29D4C] tracking-wide block mt-1">Strong password</span>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-2">
                <label className="block text-[12px] font-bold font-sans text-[#4A3E25] mb-1.5 pl-1">
                  <span className="text-[#A31D24] mr-1">*</span>Confirm Password
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full py-3 pl-5 pr-12 bg-white/70 border border-[#CCBFA3] rounded-full text-[13.5px] font-sans text-[#333] outline-none focus:border-[#6B0F1A] focus:bg-white transition-all shadow-inner" 
                    placeholder="Re-enter your password" 
                    value={form.confirmPassword} 
                    onChange={e => handleChange('confirmPassword', e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#9E9075] hover:text-[#590C15] cursor-pointer p-0 text-[16px]"
                  >
                    👁
                  </button>
                </div>
              </div>

              {/* Dynamic Tan Verification Container Panel */}
              <div className="bg-[#F5EED8]/60 border border-[#DCD3B8] rounded-[20px] p-5 flex flex-col items-center shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[12.5px] font-sans text-[#544931] text-center px-2">
                  <span>
                    A verification code was sent to <strong className="text-[#590C15] font-bold">{form.schoolEmail}</strong>
                  </span>
                </div>

                {/* Validation Code Cell Boxes */}
                <div className="flex gap-2 justify-center mb-4">
                  {verificationCode.map((digit, i) => (
                    <input
                      key={i}
                      id={`code-${i}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeChange(i, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(i, e)}
                      className={`w-[44px] h-[48px] text-center text-[18px] font-bold bg-white border rounded-xl outline-none transition-all ${digit ? 'border-[#590C15] text-[#590C15] ring-1 ring-[#590C15]' : 'border-[#CCBFA3] text-[#333] focus:border-[#590C15]'}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEmailVerified(true)}
                  className={`py-2 px-6 rounded-full text-[12px] font-sans font-bold tracking-wide transition-all ${isEmailVerified ? 'bg-emerald-700 text-white shadow-none cursor-default' : 'bg-[#590C15] text-white hover:bg-[#42080F] shadow-sm cursor-pointer'}`}
                >
                  {isEmailVerified ? 'Email Verified ✓' : 'Verify Email'}
                </button>
                
                <p className="text-[11px] font-sans text-gray-400 mt-2.5">
                  Didn't receive? <span className="text-[#590C15] font-bold hover:underline cursor-pointer">Resend</span>
                </p>
              </div>

              {/* Bottom Custom T&C Checkbox */}
              <label className="flex items-center gap-2.5 text-[12px] font-sans text-[#544931] mt-2 pl-1 select-none">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms} 
                  onChange={e => setAgreedToTerms(e.target.checked)} 
                  className="w-4 h-4 accent-[#6B0F1A] cursor-pointer rounded border-[#CCBFA3]" 
                />
                <span>
                  I agree to the{' '}
                  <span 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-[#590C15] font-bold underline hover:text-[#42080F] cursor-pointer"
                  >
                    Terms and Conditions and Privacy Policy
                  </span>
                </span>
              </label>

              {/* Navigation Action Buttons */}
              <div className="flex gap-4 mt-4">
                <button 
                  type="button"
                  onClick={() => setStep(2)} 
                  className="flex-1 py-3.5 rounded-full text-[14px] font-sans font-bold flex items-center justify-center bg-[#6B0F1A] text-white hover:bg-[#520A12] shadow-md transition-all active:scale-[0.99]"
                >
                  ‹ Back
                </button>
                <button 
                  type="button"
                  disabled={!canCompleteSignup} 
                  className={`flex-1 py-3.5 rounded-full text-[14px] font-sans font-bold flex items-center justify-center gap-1.5 transition-all ${!canCompleteSignup ? 'bg-[#C2BAA8] text-[#E0DCD3] cursor-not-allowed' : 'bg-[#6B0F1A] text-white hover:bg-[#520A12] shadow-md cursor-pointer active:scale-[0.99]'}`}
                >
                  Create Account ✓
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER PERSISTENT ROUTING BRIDGE LINK */}
      <p className="text-[13px] text-[#7A6E57] font-sans mt-2">
        Already have an account?{' '}
        <button 
          type="button"
          onClick={() => onSwitchPage('login')} 
          className="bg-transparent border-none text-[#590C15] font-bold text-[13px] cursor-pointer hover:underline transition-colors p-0 ml-1"
        >
          Sign In
        </button>
      </p>

      {/* ── TERMS AND CONDITIONS MODAL OVERLAY ── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          
          {/* Close Button Top Right */}
          <button 
            onClick={() => setShowTermsModal(false)}
            className="absolute top-6 right-8 text-white text-[32px] font-sans hover:text-gray-300 transition-colors cursor-pointer"
          >
            ✕
          </button>

          {/* Parchment Scroll Container */}
          <div 
            className="w-full max-w-[540px] max-h-[85vh] overflow-y-auto rounded-md shadow-2xl p-8 md:p-10 text-[#3A2E15] font-serif"
            style={{ 
              backgroundImage: `url(${parchmentBg})`, 
              backgroundSize: 'cover',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 60px rgba(107, 15, 26, 0.1)'
            }}
          >
            <h3 className="text-[22px] font-serif italic text-[#3A2E15] mb-4">Terms and Conditions</h3>
            
            <div className="text-[14.5px] leading-relaxed italic text-[#3A2E15] flex flex-col gap-4">
              <p>
                By creating an account and accessing the system, the Student User
                agrees to comply with the following terms:
              </p>

              <div>
                <p>1. Purpose of Use</p>
                <p>
                  The system shall be used solely for academic and research-related
                  purposes. Any use beyond its intended academic function is strictly
                  prohibited.
                </p>
              </div>

              <div>
                <p>2. User Responsibility</p>
                <p>
                  The Student User warrants that all information provided during
                  registration and use of the system is accurate, complete, and up to date.
                </p>
              </div>

              <div>
                <p>3. Research Submission Policy</p>
                <p>The Student User shall only upload research manuscripts that are:</p>
                <ul className="list-disc pl-5 my-1">
                  <li>Originally authored by the user; or</li>
                  <li>Submitted with proper authorization and consent from all concerned parties.</li>
                </ul>
                <p>
                  All submitted research manuscripts must have undergone appropriate
                  academic review and must be duly approved, where applicable, by the
                  assigned Research Adviser and/or authorized academic officials such as
                  the Department Head or Dean, in accordance with institutional
                  requirements.
                </p>
              </div>

              <div>
                <p>4. Intellectual Property Rights</p>
                <p>
                  All submitted research materials shall remain the intellectual property
                  of the original author(s). The system shall not claim ownership but shall
                  be granted permission to store, display, and manage such materials
                  strictly for academic and research purposes.
                </p>
              </div>

              <div>
                <p>5. Access and Usage Limitation</p>
                <p>
                  The Student User acknowledges that all research documents available
                  within the system are provided strictly for academic reference
                  purposes. All accessible documents are view-only, and the Student User
                  shall not download, reproduce, distribute, or modify any research
                  material without prior authorization from the respective author(s)
                  and/or authorized academic personnel.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <a href="#" className="text-[#A31D24] text-[13px] italic underline hover:text-[#590C15] transition-colors">
                Read full Terms and Conditions
              </a>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}