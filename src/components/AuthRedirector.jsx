import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthRedirector = ({ user, profileLoading }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if user is logged in, on the root path, and profile has finished loading
    if (user && !profileLoading && location.pathname === '/') {
      navigate('/app');
    }
  }, [user, profileLoading, location.pathname, navigate]);

  return null; // This component doesn't render anything visible
};

export default AuthRedirector;