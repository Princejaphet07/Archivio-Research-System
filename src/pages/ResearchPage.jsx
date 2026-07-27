import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import swuLogoSeal from '../assets/new icon.png';
import parchmentBg from '../assets/parchment.jpg';
import swuBuilding from '../assets/swu-building.png';

export default function ResearchPage({ onLogout, studentName, initials, onUploadClick, activeTab, setActiveTab, profilePhotoUrl }) {
  const displayName = studentName || 'STUDENT';
  const displayInitials = initials || 'JZ';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All Category');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [expandedPaper, setExpandedPaper] = useState(null);

  const categories = ['All Category', 'Computer Science', 'Information Technology', 'Information Systems', 'Engineering', 'Business', 'Education'];

  // Sample research papers data
  const researchPapers = [
    {
      id: 1,
      title: "AI-Driven Predictive Grid Management: Optimizing Renewable Energy Distribution in Decentralized Smart Cities",
      authors: "Hylla Mae Tejada & Prince Japhet Vender",
      year: "2027",
      abstract: "As urban centers transition toward decentralized energy architectures, the integration of intermittent renewable sources, such as solar and wind, presents significant challenges for grid stability. This research investigates the implementation of AI-driven predictive models to optimize energy distribution within smart city frameworks. Traditional grid management often struggles with the volatility of renewable generation and the shifting demand patterns of a decentralized 'prosumer' (producer-consumer) economy.",
      category: "Computer Science",
      keywords: "AI, Renewable Energy, Smart Cities, Grid Management",
      fullPaper: "#",
      advisor: "Dr. Orsinge"
    },
    {
      id: 2,
      title: "The Efficacy of AI-Enabled Digital Twins in Personalized Oncology: Improving Patient Outcomes through Simulated Treatment Responses",
      authors: "John Doe & Andrea Perote",
      year: "2026",
      abstract: "This research evaluates AI-enabled digital twins for simulating personalized cancer treatments to replace 'one-size-fits-all' oncology. By analyzing individual patient data, the study aims to predict treatment efficacy before actual clinical administration. This approach seeks to eliminate the trial-and-error phase, significantly reducing toxic side effects. Ultimately, it provides a risk-free environment for doctors to optimize clinical decisions. This work offers a scalable framework to improve survival rates through hyper-personalized medicine.",
      category: "Information Technology",
      keywords: "Digital Twins, Oncology, AI, Personalized Medicine",
      fullPaper: "#",
      advisor: "Dr. Orsinge"
    }
  ];

  const handleSidebarNavigation = (tabName) => {
    setActiveTab(tabName);
    setSidebarOpen(false);
  };

  const toggleReadMore = (id) => {
    setExpandedPaper(expandedPaper === id ? null : id);
  };

  const filteredPapers = researchPapers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          paper.authors.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'All Category' || paper.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full min-h-screen font-serif flex flex-col bg-[#F5F5F0]">
      {/* Top Header Bar */}
      <div 
        className="w-full flex items-center gap-4 px-7 py-3 border-b border-[#b4a078]/30 z-[1000]"
        style={{ 
          backgroundImage: `url(${parchmentBg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center top' 
        }}
      >
        <img src={swuLogoSeal} alt="SWU Logo" className="w-[52px] h-[52px] object-contain" />
        <span className="text-[17px] font-bold text-[#3a1a1a] tracking-[0.18em]">
          WELCOME {displayName.toUpperCase()}
        </span>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        
        <Sidebar 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          activeTab={activeTab} 
          setActiveTab={handleSidebarNavigation}
          onLogout={onLogout}
          studentName={studentName}
          initials={initials}
          profilePhotoUrl={profilePhotoUrl}
        />

        {/* Right Side Content */}
        <div className="flex-1 flex flex-col overflow-y-auto w-full">
          
          {/* Maroon Nav Bar */}
          <div className="w-full bg-[#6B0F1A] flex items-center justify-between px-6 h-12 shrink-0 relative z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="text-white text-[22px] leading-none p-1 hover:opacity-80 transition-opacity"
              >
                ☰
              </button>
              <span className="text-white text-[16px] tracking-wider">Research Archive</span>
            </div>

            <div className="w-[34px] h-[34px] rounded-full border-2 border-white/60 bg-white/15 flex items-center justify-center text-white text-[13px] font-bold cursor-pointer tracking-wider overflow-hidden">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                displayInitials
              )}
            </div>
          </div>

          {/* Hero Section */}
          <div className="w-full h-[420px] relative overflow-hidden shrink-0">
            <img src={swuBuilding} alt="SWU Campus" className="w-full h-full object-cover object-center block" />
            <div className="absolute inset-0 bg-black/30" />

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-7">
              <h1 className="text-white text-4xl text-center tracking-wide leading-snug drop-shadow-md max-w-2xl">
                Research Archive
              </h1>
              <p className="text-white/90 text-center max-w-2xl px-4">
                Discover cutting-edge research papers and academic publications from our community
              </p>

              {/* Search Bar */}
              <div className="flex items-center w-full max-w-xl">
                <div className="flex-1 flex items-center bg-white rounded-l-3xl px-4 h-11 shadow-md">
                  <span className="text-[#999] text-base mr-2.5">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by title or author..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 border-none outline-none text-sm font-serif text-[#333] bg-transparent"
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setCategoryOpen(!categoryOpen)}
                    className="h-11 px-4 bg-[#6B0F1A] text-white rounded-r-3xl text-sm font-serif flex items-center gap-2 shadow-md whitespace-nowrap"
                  >
                    ▾ {category}
                  </button>
                  
                  {categoryOpen && (
                    <div className="absolute top-12 right-0 bg-white border border-[#e0d0b0] rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                      {categories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => { setCategory(cat); setCategoryOpen(false); }}
                          className={`block w-full text-left px-4 py-2.5 text-[13px] font-serif transition-colors ${
                            cat === category ? 'bg-[#f5ece0] text-[#333]' : 'bg-white text-[#333] hover:bg-[#f5ece0]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Research Papers List */}
          <div className="flex-1 px-8 py-8">
            <div className="flex justify-end mb-6">
              <button 
                onClick={onUploadClick}
                className="text-[#6B0F1A] text-[15px] font-serif hover:underline flex items-center gap-1.5 transition-all"
              >
                <span className="text-lg font-light no-underline">+</span>
                Upload a Research
              </button>
            </div>

            {filteredPapers.length === 0 ? (
              <div className="text-center py-16 text-[#aaa] text-[15px] italic">
                No research papers found. Upload one to get started.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPapers.map(paper => (
                  <div key={paper.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      {/* Title */}
                      <h3 className="text-xl font-bold text-[#3a1a1a] mb-2">
                        {paper.title}
                      </h3>
                      
                      {/* Advisor */}
                      <div className="text-md font-semibold text-[#6B0F1A] mb-1">
                        {paper.advisor}
                      </div>
                      
                      {/* Authors and Year */}
                      <div className="text-sm text-gray-600 mb-3">
                        Authors: {paper.authors}
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        Year: {paper.year}
                      </div>
                      
                      {/* Abstract */}
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {expandedPaper === paper.id ? paper.abstract : `${paper.abstract.substring(0, 300)}...`}
                      </p>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => toggleReadMore(paper.id)}
                          className="text-[#6B0F1A] hover:text-[#8B2F3A] font-medium text-sm transition-colors"
                        >
                          {expandedPaper === paper.id ? 'Read Less' : 'Read More'}
                        </button>
                        <button className="text-[#6B0F1A] hover:text-[#8B2F3A] font-medium text-sm transition-colors">
                          View Full Paper
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}