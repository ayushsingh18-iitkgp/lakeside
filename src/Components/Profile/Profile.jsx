import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../Contexts/UserProfileContext';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  LogOut,
  FileText,
  Image as ImageIcon,
  X,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import localForage from 'localforage';
import homebcg from '.././finalhome.webp';

const BackendUrl = import.meta.env.VITE_BackendUrl;
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

// Custom Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
      <div className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white font-semibold`}>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default function Profile() {
  const navigate = useNavigate();
  const { userProfile, logout, updateProfile } = useUserProfile();
  const fileInputRef = useRef(null);

  const [userData, setUserData] = useState(null);
  const [originalUserData, setOriginalUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Edit states
  const [editingBio, setEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Configure localForage
  useEffect(() => {
    localForage.config({
      name: 'promImageCache',
      storeName: 'images',
      version: 1.0
    });
  }, []);

  useEffect(() => {
    const loadUserData = () => {
      try {
        let data = null;

        if (userProfile) {
          data = userProfile;
        } else {
          const storedData = localStorage.getItem('userDetails');
          if (storedData) {
            data = JSON.parse(storedData);
          }
        }

        if (data) {
          const profilePhotoArray = Array.isArray(data.profilePhoto) ? data.profilePhoto : [];
          const userInfo = {
            SfId: data.SfId,
            fullName: data.name,
            email: data.email,
            phone: data.mobile,
            dateOfBirth: data.dob,
            gender: data.gender === 'M' ? 'Male' : 'Female',
            college: 'IIT Kharagpur',
            rollNo: data.rollNo || '',
            bio: data.Bio || '',
            profilePhoto: profilePhotoArray
          };
          setUserData(userInfo);
          setOriginalUserData(JSON.parse(JSON.stringify(userInfo)));
          setTempBio(data.Bio || '');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [userProfile]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Clear IndexedDB cache
  const clearImageCache = async () => {
    try {
      await localForage.clear();

      if (window.indexedDB) {
        const dbName = "promImageCache";
        const request = indexedDB.deleteDatabase(dbName);

        request.onsuccess = () => {
        };

        request.onerror = (event) => {
          console.error(`❌ Failed to delete database "${dbName}":`, event.target.error);
        };

        request.onblocked = () => {
          console.warn(`⚠️ Database "${dbName}" deletion was blocked.`);
        };
      }
    } catch (error) {
      console.error('❌ Error clearing image cache:', error);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    showToast('Logging out...', 'success');

    await clearImageCache();

    setTimeout(() => {
      logout();
      navigate('/login');
    }, 1500);
  };

  const getAuthToken = () => {
    const token = localStorage.getItem('User_Token');
    return token;
  };

  // Image compression function
  const compressImage = (file, targetSize = MAX_IMAGE_SIZE) => {
    return new Promise((resolve, reject) => {
      if (file.size <= targetSize) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          let quality = 0.9;
          const minQuality = 0.1;
          const qualityStep = 0.1;
          let attempts = 0;
          const maxAttempts = 10;

          const tryCompress = () => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }
              attempts++;
              if (blob.size <= targetSize || attempts >= maxAttempts || quality <= minQuality) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
                return;
              }

              quality = Math.max(quality - qualityStep, minQuality);
              tryCompress();
            }, file.type, quality);
          };

          tryCompress();
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Upload image to S3
  const uploadImageToS3 = async (file) => {
    try {
      const { data } = await axios.post(`${BackendUrl}/api/user/upload_photo_url`, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size
      });

      if (data.code === 0 || data.code === "0") {
        await axios.put(data.uploadUrl, file, {
          headers: { 'Content-Type': file.type }
        });
        return data.uploadUrl.split('?')[0];
      } else {
        throw new Error(data.message || 'Failed to get upload URL');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Helper function to extract URL from photo object or string
  const extractPhotoUrl = (photo) => {
    if (typeof photo === 'string') {
      return photo;
    } else if (photo && typeof photo === 'object' && photo.url) {
      return photo.url;
    }
    return '';
  };

  // Handle photo edit
  const handlePhotoEdit = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    showToast('Compressing image...', 'success');

    try {
      const compressedFile = await compressImage(file, MAX_IMAGE_SIZE);
      showToast('Uploading image...', 'success');

      const uploadedUrl = await uploadImageToS3(compressedFile);

      const currentPhotos = userData.profilePhoto.map(photo => extractPhotoUrl(photo));

      const updatedPhotosArray = [...currentPhotos];
      updatedPhotosArray[index] = uploadedUrl;

      const token = getAuthToken();
      if (!token) {
        showToast('Authentication token not found', 'error');
        return;
      }

      setUpdatingProfile(true);
      const response = await axios.post(
        `${BackendUrl}/api/update_profile`,
        {
          token: token,
          SfId: userData.SfId,
          profilePhoto: updatedPhotosArray
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        updateProfile({ profilePhoto: updatedPhotosArray });
        setUserData(prev => ({ ...prev, profilePhoto: updatedPhotosArray }));
        showToast('Photo updated successfully!', 'success');
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating photo:', error);
      showToast('Failed to update photo', 'error');
    } finally {
      setUpdatingProfile(false);
      setUploadingPhoto(false);
      setEditingPhotoIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // Handle bio edit
  const handleBioSave = async () => {
    if (tempBio.trim() === originalUserData.bio.trim()) {
      showToast('Please make a change to update bio', 'error');
      return;
    }

    if (tempBio.trim().length < 10) {
      showToast('Bio must be at least 10 characters', 'error');
      return;
    }

    try {
      await updateProfileAPI({ Bio: tempBio });
      updateProfile({ Bio: tempBio });
      setUserData(prev => ({ ...prev, bio: tempBio }));
      setOriginalUserData(prev => ({ ...prev, bio: tempBio }));
      setEditingBio(false);
      showToast('Bio updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating bio:', error);
      showToast('Failed to update bio', 'error');
    }
  };

  // Update profile API call
  const updateProfileAPI = async (updates) => {
    setUpdatingProfile(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showToast('Authentication token not found', 'error');
        return;
      }

      const response = await axios.post(
        `${BackendUrl}/api/update_profile`,
        {
          token: token,
          SfId: userData.SfId,
          ...updates
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showToast('Authentication token not found', 'error');
        return;
      }

      const response = await axios.post(
        `${BackendUrl}/api/delete_profile`,
        {
          token: token,
          SfId: userData.SfId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        showToast('Account deleted successfully', 'success');

        await clearImageCache();

        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete account';
      showToast(errorMessage, 'error');
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center profile-background"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#ffe8cc'
        }}
      >
        <div className="text-center bg-white/20 backdrop-blur-md p-8 rounded-3xl">
          <div className="w-16 h-16 border-4 border-[#a91851] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-white drop-shadow-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center profile-background"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#ffe8cc'
        }}
      >
        <div className="text-center bg-white/20 backdrop-blur-md p-8 rounded-3xl">
          <div className="text-xl font-semibold text-white drop-shadow-lg">No user data available</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Mobile responsive background */
        @media (max-width: 1024px) {
          .profile-background {
            background-position: center center !important;
            background-size: cover !important;
          }
        }

        /* Custom Elegant Scrollbar for Profile Page */
        .overflow-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .overflow-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #a91851, #d4758f);
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #8e1645, #a91851);
          box-shadow: 0 0 8px rgba(169, 24, 81, 0.6);
        }

        .overflow-auto {
          scrollbar-width: thin;
          scrollbar-color: #a91851 rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div
        className="min-h-screen pb-24 lg:pb-4 overflow-auto profile-background"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#ffe8cc'
        }}
      >
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handlePhotoEdit(e, editingPhotoIndex)}
          className="hidden"
        />

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewPhoto}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
              }}
            />
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
              <h2 className="text-xl font-bold text-[#a91851] mb-3 text-center">
                Confirm Logout
              </h2>
              <p className="text-gray-600 text-center mb-6 text-sm">
                Are you sure you want to logout?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 bg-[#a91851] text-white font-semibold py-2.5 rounded-lg hover:bg-[#8e1645] transition-colors"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-red-600 mb-3 text-center">
                Delete Account?
              </h2>
              <p className="text-gray-600 text-center mb-6 text-sm">
                This action cannot be undone. All your data will be permanently deleted.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  className="flex-1 bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE CONTENT */}
        <div className="w-full lg:max-w-3xl lg:mx-auto">
          {/* Profile Header */}
          <div className="px-6 pt-6 pb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#a91851] mb-3 drop-shadow-lg">Profile</h1>
          </div>

          {/* Profile Content */}
          <div className="px-4 space-y-4">
            {/* User Info Card */}
            <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl p-6 border-2 border-white/30">
              <div className="space-y-0">
                {/* Full Name */}
                <div className="flex items-center gap-4 py-4 border-b-2 border-white/30">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/80 font-medium drop-shadow">Full Name</p>
                    <p className="text-base font-semibold text-white drop-shadow-lg">{userData.fullName}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4 py-4 border-b-2 border-white/30">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/80 font-medium drop-shadow">Email</p>
                    <p className="text-base font-semibold text-white drop-shadow-lg break-all">{userData.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4 py-4 border-b-2 border-white/30">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/80 font-medium drop-shadow">Phone</p>
                    <p className="text-base font-semibold text-white drop-shadow-lg">{userData.phone}</p>
                  </div>
                </div>

                {/* College */}
                <div className="flex items-center gap-4 py-4 border-b-2 border-white/30">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/80 font-medium drop-shadow">College</p>
                    <p className="text-base font-semibold text-white drop-shadow-lg">{userData.college}</p>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="flex items-center gap-4 py-4 border-b-2 border-white/30">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/80 font-medium drop-shadow">Date of Birth</p>
                    <p className="text-base font-semibold text-white drop-shadow-lg">{formatDate(userData.dateOfBirth)}</p>
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center gap-4 py-4 border-b-2 border-white/30">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/80 font-medium drop-shadow">Gender</p>
                    <p className="text-base font-semibold text-white drop-shadow-lg">{userData.gender}</p>
                  </div>
                </div>

                {/* Roll Number */}
                {userData.rollNo && (
                  <div className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white/80 font-medium drop-shadow">Roll Number</p>
                      <p className="text-base font-semibold text-white drop-shadow-lg">{userData.rollNo}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bio Section */}
            <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl p-6 border-2 border-white/30">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-white/80 font-medium drop-shadow">Bio</p>
                    {!editingBio && (
                      <button
                        onClick={() => setEditingBio(true)}
                        className="text-white hover:text-[#a91851] transition-colors"
                      >
                        <Edit className="w-4 h-4 drop-shadow" />
                      </button>
                    )}
                  </div>
                  {editingBio ? (
                    <div className="space-y-2">
                      <textarea
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white/90 border-2 border-white/30 rounded-lg focus:ring-2 focus:ring-[#a91851] focus:border-[#a91851] outline-none resize-none text-gray-800"
                        rows="4"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingBio(false);
                            setTempBio(userData.bio);
                          }}
                          className="flex-1 bg-white/80 text-gray-700 font-semibold py-2 rounded-lg hover:bg-white transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBioSave}
                          disabled={updatingProfile}
                          className="flex-1 bg-[#a91851] text-white font-semibold py-2 rounded-lg hover:bg-[#8e1645] transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {updatingProfile ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base text-white leading-relaxed drop-shadow">{userData.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Photos Section */}
            {userData.profilePhoto && userData.profilePhoto.length > 0 && (
              <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl p-6 border-2 border-white/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs text-white/80 font-medium drop-shadow">Profile Photos</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {userData.profilePhoto.map((photo, index) => {
                    const imageUrl = extractPhotoUrl(photo);
                    const photoId = typeof photo === 'object' ? photo?.id : index;

                    return (
                      <div key={photoId} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Profile ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer border-2 border-white/50 hover:border-white transition-all"
                          onClick={() => setPreviewPhoto(imageUrl)}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                            e.target.onerror = null;
                          }}
                        />
                        {/* Edit button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPhotoIndex(index);
                            fileInputRef.current?.click();
                          }}
                          disabled={uploadingPhoto}
                          className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-md hover:bg-white transition-all lg:opacity-0 lg:group-hover:opacity-100 disabled:opacity-50"
                        >
                          {uploadingPhoto && editingPhotoIndex === index ? (
                            <Loader2 className="w-4 h-4 text-[#a91851] animate-spin" />
                          ) : (
                            <Edit className="w-4 h-4 text-[#a91851]" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full bg-white/20 backdrop-blur-md rounded-3xl shadow-xl p-4 flex items-center gap-4 hover:bg-white/30 transition-all border-2 border-white/30"
            >
              <div className="w-10 h-10 bg-[#a91851] rounded-full flex items-center justify-center">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-semibold text-white drop-shadow-lg">Logout</span>
            </button>

            {/* Delete Account Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-white/20 backdrop-blur-md rounded-3xl shadow-xl p-4 flex items-center gap-4 hover:bg-red-500/30 transition-all border-2 border-white/30"
            >
              <div className="w-10 h-10 bg-[#DC2626] rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-semibold text-white drop-shadow-lg">Delete Account</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
