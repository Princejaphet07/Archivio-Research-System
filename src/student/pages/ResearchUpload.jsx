import React, { useState } from 'react';
import swuLogoSeal from '../../assets/new icon.png';
import parchmentBg from '../../assets/parchment.jpg';
import Swal from 'sweetalert2';

export default function ResearchUpload({ onBackToResearch, studentName, initials }) {
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    category: '',
    publicationDate: '',
    keywords: '',
    abstract: '',
    document: null
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

  const categories = ['Computer Science', 'Information Technology', 'Information Systems', 'Engineering', 'Business', 'Education'];

  const displayName = studentName || 'STUDENT';
  const displayInitials = initials || 'JZ';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const maxSize = 50 * 1024 * 1024;
    
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, document: 'Please upload a PDF, DOC, DOCX, XLSX, or SAVI file.' }));
      return;
    }
    
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, document: 'File size must be less than 50MB.' }));
      return;
    }
    
    setFormData(prev => ({ ...prev, document: file }));
    setFileName(file.name);
    setErrors(prev => ({ ...prev, document: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Research title is required';
    if (!formData.authors.trim()) newErrors.authors = 'At least one author is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.publicationDate) {
      newErrors.publicationDate = 'Publication date is required';
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.publicationDate)) {
      newErrors.publicationDate = 'Please use dd/mm/yyyy format';
    }
    if (!formData.keywords.trim()) newErrors.keywords = 'Keywords are required';
    if (!formData.abstract.trim()) newErrors.abstract = 'Abstract is required';
    if (formData.abstract.trim().length < 50) newErrors.abstract = 'Abstract should be at least 50 characters';
    if (!formData.document) newErrors.document = 'Please upload your research document';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('authors', formData.authors);
    submitData.append('category', formData.category);
    submitData.append('publicationDate', formData.publicationDate);
    submitData.append('keywords', formData.keywords);
    submitData.append('abstract', formData.abstract);
    submitData.append('document', formData.document);
    
    try {
      // Replace with your actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Swal.fire({
        title: 'Success!',
        text: 'Research uploaded successfully!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      onBackToResearch();
      
    } catch (error) {
      console.error('Upload error:', error);
      Swal.fire('Error', 'Failed to upload research. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Any unsaved changes will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel!'
    });
    if (result.isConfirmed) {
      onBackToResearch();
    }
  };

  return (
    <div className="w-full min-h-screen font-serif bg-[#F5F5F0]">
      {/* Top Header Bar */}
      <div 
        className="w-full flex items-center justify-between px-7 py-3 border-b border-[#b4a078]/30"
        style={{ 
          backgroundImage: `url(${parchmentBg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center top' 
        }}
      >
        <div className="flex items-center gap-4">
          <img src={swuLogoSeal} alt="SWU Logo" className="w-[52px] h-[52px] object-contain" />
          <span className="text-[17px] font-bold text-[#3a1a1a] tracking-[0.18em]">
            WELCOME {displayName.toUpperCase()}
          </span>
        </div>
        <button 
          onClick={onBackToResearch}
          className="text-[#6B0F1A] hover:text-[#8B2F3A] transition-colors text-sm font-serif"
        >
          ← Back to Research
        </button>
      </div>

      {/* Upload Form Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-[#6B0F1A] to-[#8B2F3A] px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Upload a Research</h1>
            <p className="text-white/80 text-sm mt-1">Submit your research paper to the archive</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Research Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Research Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter the title of your research"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B0F1A] transition-all ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Author(s) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Author(s) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="authors"
                value={formData.authors}
                onChange={handleInputChange}
                placeholder="Enter author names (separated by commas)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B0F1A] transition-all ${
                  errors.authors ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.authors && <p className="text-red-500 text-xs mt-1">{errors.authors}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B0F1A] transition-all ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            {/* Publication Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Publication Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="publicationDate"
                value={formData.publicationDate}
                onChange={handleInputChange}
                placeholder="dd/mm/yyyy"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B0F1A] transition-all ${
                  errors.publicationDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.publicationDate && <p className="text-red-500 text-xs mt-1">{errors.publicationDate}</p>}
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Keywords <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="Enter keywords (separated by commas)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B0F1A] transition-all ${
                  errors.keywords ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.keywords && <p className="text-red-500 text-xs mt-1">{errors.keywords}</p>}
            </div>

            {/* Abstract */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Abstract <span className="text-red-500">*</span>
              </label>
              <textarea
                name="abstract"
                value={formData.abstract}
                onChange={handleInputChange}
                rows="6"
                placeholder="Enter a brief abstract of your research (minimum 50 characters)..."
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B0F1A] transition-all resize-none ${
                  errors.abstract ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.abstract && <p className="text-red-500 text-xs mt-1">{errors.abstract}</p>}
              <p className="text-gray-400 text-xs mt-1">
                {formData.abstract.length} characters (minimum 50)
              </p>
            </div>

            {/* Research Document Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Research Document <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-[#6B0F1A] bg-[#FFF5F0]' 
                    : errors.document 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-[#6B0F1A]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="document"
                  name="document"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xlsx,.savi"
                  className="hidden"
                />
                <label htmlFor="document" className="cursor-pointer block">
                  <div className="text-4xl mb-3">📄</div>
                  {fileName ? (
                    <div className="text-green-600 font-medium mb-2">{fileName}</div>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-2">Drag and drop your research document here</p>
                      <p className="text-gray-400 text-sm">or</p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => document.getElementById('document').click()}
                    className="mt-3 px-4 py-2 bg-[#6B0F1A] text-white rounded-lg hover:bg-[#8B2F3A] transition-colors text-sm"
                  >
                    Browse Files
                  </button>
                  <p className="text-gray-400 text-xs mt-3">Supported formats: PDF, DOC, DOCX, XLSX, SAVI (Max 50MB)</p>
                </label>
              </div>
              {errors.document && <p className="text-red-500 text-xs mt-1">{errors.document}</p>}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-2 bg-[#6B0F1A] text-white rounded-lg hover:bg-[#8B2F3A] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Uploading...' : 'Upload Research'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
