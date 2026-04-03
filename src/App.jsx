import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { UserProfileProvider } from './Components/Contexts/UserProfileContext.jsx';
import Login from './Components/Authentication/Login';
import Signup from './Components/Authentication/Signup';
import Home from './Components/Home/Home';
import PhoneNav from './Components/Navbar/PhoneNav';
import DesktopNav from './Components/Navbar/DesktopNav';
import Like from './Components/Likes/Like';
import Chats from './Components/Chats/Chats';
import Profile from './Components/Profile/Profile';
import Stars from './Components/stars/stars';
import ProtectedRoute from './Components/Protected and Public Routes/ProtectedRoute';
import PublicRoute from './Components/Protected and Public Routes/PublicRoute';

function App() {
  const [isChatting, setIsChatting] = useState(false);

  return (
    <UserProfileProvider>
      <Router>
        <Routes>
          {/* Public Routes - Only accessible when NOT logged in */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          {/* Protected Routes - Only accessible when logged in */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <DesktopNav />
                  <div className="flex-1 flex flex-col">
                    <Home />
                    <PhoneNav />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/likes"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <DesktopNav />
                  <div className="flex-1 flex flex-col">
                    <Like />
                    <PhoneNav />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <DesktopNav />
                  <div className="flex-1 flex flex-col">
                    <Chats onChatStateChange={setIsChatting} />
                    {!isChatting && <PhoneNav />}
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <DesktopNav />
                  <div className="flex-1 flex flex-col">
                    <Profile />
                    <PhoneNav />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stars"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <DesktopNav />
                  <div className="flex-1 flex flex-col">
                    <Stars />
                    <PhoneNav />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </UserProfileProvider>
  );
}

export default App;