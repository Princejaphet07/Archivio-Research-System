import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdviser } from '../context/AdviserContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAdviser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7a2e46] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
