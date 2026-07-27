import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ children, title, breadcrumb, showSearch = true, searchQuery, onSearchChange }) {
  return (
    <div className="flex h-screen bg-[#f5f0e6] font-sans overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Header 
          title={title} 
          breadcrumb={breadcrumb} 
          showSearch={showSearch} 
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;