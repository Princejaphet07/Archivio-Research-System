import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      Swal.fire({
        title: 'Sign In Required',
        text: 'Please log in or sign up with your @phinmaed.com account to view and read full research manuscripts.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#7a2039',
        confirmButtonText: 'Log In Now',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'dark:bg-gray-800 dark:text-gray-100',
          title: 'dark:text-gray-100'
        }
      }).then((res) => {
        if (res.isConfirmed) {
          navigate('/login', { state: { from: location } });
        } else {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/browse');
          }
        }
      });
    }
  }, [currentUser, location, navigate]);

  if (!currentUser) {
    return null;
  }

  return children;
}

