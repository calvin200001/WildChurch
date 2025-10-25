import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthRedirector = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user is logged in and currently on the root landing page
    if (user && location.pathname === '/') {
      navigate('/app');
    }
  }, [user, location.pathname, navigate]);

  return null; // This component doesn't render anything visible
};

export default AuthRedirector;