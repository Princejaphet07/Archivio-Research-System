import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdviser } from '../context/AdviserContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAdviser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-bold text-[#7a1f3d] tracking-widest uppercase">Loading...</p>
        </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
