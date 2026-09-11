import React, { createContext, useState, useContext, useEffect } from 'react';

const UserProfileContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export const UserProfileProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedToken = localStorage.getItem('User_Token');
        const storedUserDetails = localStorage.getItem('userDetails');

        if (storedToken && storedUserDetails) {
          setToken(storedToken);
          setUserProfile(JSON.parse(storedUserDetails));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const login = (userData, authToken) => {
    try {
      const userDetails = {
        id: userData.id,
        userId: userData.userId,
        SfId: userData.SfId,
        name: userData.name,
        email: userData.email,
        mobile: userData.mobile,
        dob: userData.dob,
        gender: userData.gender,
        Bio: userData.Bio || '',
        profilePhoto: userData.profilePhoto || [],
        rollNo: userData.rollNo || '', // NEW: Roll Number field
        likesGiven: userData.likesGiven || [],
        likesReceived: userData.likesReceived || []
      };

      localStorage.setItem('User_Token', authToken);
      localStorage.setItem('userDetails', JSON.stringify(userDetails));

      setToken(authToken);
      setUserProfile(userDetails);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('User_Token');
      localStorage.removeItem('userDetails');

      setToken(null);
      setUserProfile(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  const updateProfile = (updatedData) => {
    try {
      const newProfile = { ...userProfile, ...updatedData };
      localStorage.setItem('userDetails', JSON.stringify(newProfile));
      setUserProfile(newProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const value = {
    userProfile,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

export default UserProfileContext;
