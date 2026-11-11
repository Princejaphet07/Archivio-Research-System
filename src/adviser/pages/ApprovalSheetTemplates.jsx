import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { db, auth, storage } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAdviser } from '../context/AdviserContext';
import { Card, SectionTitle, StatusBadge } from '../../components/ui/Card';
import BookLoader from '../../components/BookLoader';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import { 
  FileText, 
  UploadCloud, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Sparkles, 
  Calendar, 
  Building2, 
  FileCheck,
  ToggleLeft,
  ToggleRight,
  ExternalLink
} from 'lucide-react';

const ACADEMIC_YEARS = [
  '2024-2025',
  '2023-2024',
  '2025-2026'
];

export default function ApprovalSheetTemplates() {
  const { adviserData } = useAdviser();
  const fileInputRef = useRef(null);

  // Form State
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [department, setDepartment] = useState(adviserData?.department || adviserData?.program || '');
  const [isDragging, setIsDragging] = useState(false);

  // Loading & Progress States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('Uploading template...');

  // Templates List State
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Sync department when adviserData is loaded
  useEffect(() => {
    if (adviserData?.department || adviserData?.program) {
      setDepartment(adviserData.department || adviserData.program);
    }
  }, [adviserData]);

  // Real-time listener for templates uploaded by this adviser
  useEffect(() => {
    const user = auth.currentUser;
    const userEmail = user?.email?.toLowerCase().trim();
    const userUid = user?.uid;
    if (!userEmail && !userUid) {
      setLoadingTemplates(false);
      return;
    }

    const q = query(collection(db, 'approval_sheet_templates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTemplates = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter templates belonging to this adviser (by UID, email, or department)
      const myTemplates = allTemplates.filter(t => {
        const tEmail = (t.adviserEmail || '').toLowerCase();
        const tUid = t.adviserUid;
        if (userEmail && tEmail === userEmail) return true;
        if (userUid && tUid === userUid) return true;
        return false;
      });

      // Sort by updatedAt or createdAt desc
      myTemplates.sort((a, b) => {
        const tA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tB - tA;
      });

      setTemplates(myTemplates);
      setLoadingTemplates(false);
    }, (err) => {
      console.warn('Templates listener notice:', err.message);
      setLoadingTemplates(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'doc'];

    if (!allowed.includes(ext)) {
      Swal.fire({
        icon: 'error',
        title: 'Unsupported File Format',
        text: 'Please upload a Word document (.docx, .doc) or a PDF file (.pdf).',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'The file exceeds the 25 MB limit.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    setFile(selectedFile);
    // Auto-fill title if empty
    if (!title.trim()) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
      setTitle(nameWithoutExt);
    }
  };

  // Upload and Save Template
  const handleUploadTemplate = async (e) => {
    e.preventDefault();

    if (!file) {
      Swal.fire({ icon: 'warning', title: 'File Required', text: 'Please select a template file to upload.', confirmButtonColor: '#7B1F35' });
      return;
    }
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'Title Required', text: 'Please provide a title for this template.', confirmButtonColor: '#7B1F35' });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Publish Template?',
      html: `
        <div style="text-align: left; font-size: 13.5px; color: #4a5568;">
          <p style="margin-bottom: 8px;">You are uploading this Approval Sheet template for your students:</p>
          <p style="font-weight: bold; color: #7B1F35; margin-bottom: 6px;">"${title.trim()}"</p>
          <p style="font-size: 12px; color: #718096; margin: 0;">Students under your advisory will be able to download and use this template.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Upload & Publish',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6B7280'
    });

    if (!confirm.isConfirmed) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText('Uploading template file to cloud storage...');

    try {
      const user = auth.currentUser;
      const userUid = user?.uid || 'adviser';
      const userEmail = user?.email?.toLowerCase().trim() || '';
      const adviserDisplayName = adviserData?.name || user?.displayName || 'Research Adviser';

      const fileExt = file.name.split('.').pop().toLowerCase();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `approval_templates/${userUid}/${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(progress);
              setUploadStatusText(`Uploading template (${progress}%)...`);
            }
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      setUploadStatusText('Saving template record for students...');
      const downloadUrl = await getDownloadURL(storageRef);

      const sizeStr = file.size > 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        : (file.size / 1024).toFixed(1) + ' KB';

      const templateData = {
        title: title.trim(),
        instructions: instructions.trim() || 'Please download and fill in the required project details before obtaining panel signatures.',
        fileName: file.name,
        fileUrl: downloadUrl,
        storagePath: storagePath,
        fileSize: sizeStr,
        fileType: fileExt,
        academicYear: academicYear,
        department: department.trim() || 'General Academics',
        adviserUid: userUid,
        adviserEmail: userEmail,
        adviserName: adviserDisplayName,
        isActive: true,
        downloadsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'approval_sheet_templates'), templateData);

      // Log activity
      await logActivity({
        user: adviserDisplayName,
        role: 'Adviser',
        action: 'Added Approval Sheet Template',
        details: `Uploaded template: "${title.trim()}" (${file.name})`,
        status: 'Success'
      });

      // Reset form
      setFile(null);
      setTitle('');
      setInstructions('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setIsUploading(false);

      Swal.fire({
        icon: 'success',
        title: 'Template Published!',
        text: 'The Approval Sheet template is now live and downloadable by your students.',
        confirmButtonColor: '#7B1F35'
      });
    } catch (err) {
      console.error('Template upload error:', err);
      setIsUploading(false);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'An error occurred while uploading. Please try again.',
        confirmButtonColor: '#7B1F35'
      });
    }
  };

  // Toggle active/inactive status
  const handleToggleActive = async (template) => {
    try {
      const newStatus = !template.isActive;
      await updateDoc(doc(db, 'approval_sheet_templates', template.id), {
        isActive: newStatus,
        updatedAt: serverTimestamp()
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: newStatus ? 'Template Activated (Visible to students)' : 'Template Deactivated (Hidden)',
        showConfirmButton: false,
        timer: 1800
      });
    } catch (err) {
      console.error('Toggle status error:', err);
      Swal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#7B1F35' });
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (template) => {
    const confirm = await Swal.fire({
      title: 'Delete Template?',
      html: `
        <div style="text-align: left; font-size: 13.5px; color: #4a5568;">
          <p style="margin-bottom: 6px;">Are you sure you want to delete this template?</p>
          <p style="font-weight: bold; color: #c53030; margin-bottom: 6px;">"${template.title}"</p>
          <p style="font-size: 12px; color: #718096; margin: 0;">Students will no longer be able to download this file.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#c53030',
      cancelButtonColor: '#6B7280'
    });

    if (!confirm.isConfirmed) return;

    try {
      // 1. Delete from storage if storagePath exists
      if (template.storagePath) {
        try {
          const fileRef = ref(storage, template.storagePath);
          await deleteObject(fileRef);
        } catch (stErr) {
          console.warn('Storage delete warning:', stErr.message);
        }
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'approval_sheet_templates', template.id));

      await logActivity({
        user: adviserData?.name || auth.currentUser?.displayName || 'Research Adviser',
        role: 'Adviser',
        action: 'Deleted Approval Sheet Template',
        details: `Deleted "${template.title}"`,
        status: 'Success'
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Template deleted',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      console.error('Delete error:', err);
      Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.message, confirmButtonColor: '#7B1F35' });
    }
  };

  return (
    <Layout
      title="Approval Sheet Templates"
      breadcrumb="Home / Approval Sheet Templates"
      showSearch={false}
    >
      {/* Full-screen Loading Overlay */}
      {isUploading && (
        <BookLoader
          fullScreen={true}
          size="lg"
          text={uploadProgress < 100 ? `UPLOADING TEMPLATE (${uploadProgress}%)...` : "PUBLISHING TEMPLATE..."}
          subtext={uploadStatusText}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <SectionTitle
            title="Approval Sheet Templates"
            subtitle="Upload and manage official approval sheet templates for your research groups and students."
          />
        </div>

        {/* Upload Form Card */}
        <Card className="p-6 md:p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-stone-200 dark:border-stone-800 mb-6">
            <div className="p-2 rounded-xl bg-[#7B1F35]/10 dark:bg-[#f8d070]/10 text-[#7B1F35] dark:text-[#f8d070]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">Add New Approval Sheet Template</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Word (.docx, .doc) or PDF templates that students can download and follow.</p>
            </div>
          </div>

          <form onSubmit={handleUploadTemplate} className="space-y-6">
            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                Template File (.docx, .doc, .pdf) <span className="text-red-500">*</span>
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#7B1F35] bg-[#7B1F35]/5 dark:border-[#f8d070] dark:bg-[#f8d070]/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/80 bg-emerald-50/40 dark:border-emerald-500/40 dark:bg-emerald-950/20'
                    : 'border-stone-300 dark:border-stone-700 hover:border-[#7B1F35] dark:hover:border-[#f8d070] bg-stone-50/60 dark:bg-stone-800/40 hover:bg-stone-50 dark:hover:bg-stone-800/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".docx,.doc,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm max-w-md truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#7B1F35]/10 dark:bg-[#f8d070]/10 text-[#7B1F35] dark:text-[#f8d070] flex items-center justify-center mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                      Drag and drop your Approval Sheet template here
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Supports Word (.docx, .doc) or PDF (.pdf) up to 25MB
                    </p>
                    <button
                      type="button"
                      className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-[#7B1F35] dark:text-[#f8d070] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Template Title & Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                  Template Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Official Capstone Approval Sheet Template (BSIT)"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1F35] dark:focus:ring-[#f8d070]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                  Academic Year
                </label>
                <div className="relative">
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#7B1F35] dark:focus:ring-[#f8d070]"
                  >
                    {ACADEMIC_YEARS.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Instructions for Students */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                Instructions / Notes for Students (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Download this file, update your group title and members, print on clean 8.5x11 substance 20 paper, have it signed by all panel members and dean, then scan as a clean PDF to submit."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1F35] dark:focus:ring-[#f8d070]"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading || !file || !title.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload & Publish Template</span>
              </button>
            </div>
          </form>
        </Card>

        {/* Existing Templates List */}
        <Card className="p-6 md:p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 mb-6">
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">Your Uploaded Templates</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Templates available for your advisory students to download.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {templates.length} {templates.length === 1 ? 'Template' : 'Templates'}
            </span>
          </div>

          {loadingTemplates ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400">
              <div className="w-8 h-8 border-2 border-[#7B1F35] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No approval sheet templates uploaded yet</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm">
                Use the form above to upload official templates so your students can download and prepare their approval sheets.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {templates.map((tpl) => (
                <div key={tpl.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {tpl.title}
                        </h4>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                          {tpl.fileType?.toUpperCase() || 'FILE'}
                        </span>
                        {tpl.isActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active (Visible to Students)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
                            Hidden
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                        {tpl.instructions}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-stone-400 dark:text-stone-500 mt-2 flex-wrap">
                        <span>File: <strong>{tpl.fileName}</strong> ({tpl.fileSize})</span>
                        <span>•</span>
                        <span>A.Y.: <strong>{tpl.academicYear}</strong></span>
                        <span>•</span>
                        <span>Department: <strong>{tpl.department}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(tpl)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        tpl.isActive
                          ? 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                          : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      }`}
                      title={tpl.isActive ? 'Hide from students' : 'Make visible to students'}
                    >
                      {tpl.isActive ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-stone-400" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    <a
                      href={tpl.fileUrl}
                      download={tpl.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#7B1F35] hover:bg-[#601829] text-white transition-colors"
                      title="Download template file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

