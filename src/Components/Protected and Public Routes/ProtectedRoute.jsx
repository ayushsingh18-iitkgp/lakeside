import { Navigate } from 'react-router-dom';
import { useUserProfile } from '../Contexts/UserProfileContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useUserProfile();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8E7B4] via-[#4DB1A7] to-[#005294]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#4DB1A7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  // If authenticated, render the children
  return children;
};

export default ProtectedRoute;
