import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdviser } from '../context/AdviserContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAdviser();

  if (loading) {
    return <LoadingScreen text="LOADING ADVISER..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
