import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Heart, X, ArrowLeft, Mail, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserProfile } from '../Contexts/UserProfileContext';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import homebcg from '.././finalhome.webp';


const BackendUrl = import.meta.env.VITE_BackendUrl;
const EXCLUDED_SF_ID = 'SF000301'; // Define the excluded SF ID


export default function Like() {
  const { userProfile, token: contextToken } = useUserProfile();
  const navigate = useNavigate();
  const [likes, setLikes] = useState([]);
  const [expandedProfile, setExpandedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserSfId, setCurrentUserSfId] = useState('');
  const [page, setPage] = useState(1);
  const [likesTotalPages, setLikesTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const gridRef = useRef(null);


  const allLikedSfIdsRef = useRef(new Set());
  const allDislikedSfIdsRef = useRef(new Set());


  useEffect(() => {
    fetchAllDislikesAndLikesAndThenReceivedLikes();
  }, []);


  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current || isLoadingMore || page >= likesTotalPages) return;
      const { scrollTop, scrollHeight, clientHeight } = gridRef.current;
      if (scrollHeight - scrollTop - clientHeight < 80) {
        loadMoreLikes();
      }
    };
    const gridElem = gridRef.current;
    if (gridElem) {
      gridElem.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (gridElem) {
        gridElem.removeEventListener('scroll', handleScroll);
      }
    };
  }, [page, likesTotalPages, isLoadingMore, likes.length]);


  const getAuthToken = () => {
    if (contextToken) return contextToken;
    return localStorage.getItem('User_Token');
  };


  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };


  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };


  const handleDragStart = (e) => {
    e.preventDefault();
    return false;
  };


  const fetchAllDislikesAndLikesAndThenReceivedLikes = async () => {
    setLoading(true);


    try {
      let userData = userProfile;
      if (!userData) {
        const storedData = localStorage.getItem('userDetails');
        if (storedData) {
          userData = JSON.parse(storedData);
        }
      }
      if (!userData || !userData.SfId) {
        toast.error('User data not found. Please login again.');
        setLoading(false);
        return;
      }


      setCurrentUserSfId(userData.SfId);
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        setLoading(false);
        return;
      }


      const allDislikedSfIds = new Set();
      let currentDislikePage = 1;
      let hasMoreDislikes = true;


      while (hasMoreDislikes) {
        const dislikeResponse = await axios.post(
          `${BackendUrl}/api/dislike/get_dislikes?page=${currentDislikePage}`,
          {
            SfId: userData.SfId,
            token: token
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );


        if (dislikeResponse.data.code === 0 || dislikeResponse.data.code === "0") {
          const { dislikesGiven = {} } = dislikeResponse.data.data;
          const dislikedData = dislikesGiven.data || [];


          dislikedData.forEach(item => {
            if (item && item.SfId) {
              allDislikedSfIds.add(item.SfId);
            }
          });


          const dislikePagination = dislikesGiven.pagination || {};
          hasMoreDislikes = currentDislikePage < (dislikePagination.totalPages || 1);
          currentDislikePage++;
        } else {
          hasMoreDislikes = false;
        }
      }


      allDislikedSfIdsRef.current = allDislikedSfIds;


      const allLikedSfIds = new Set();
      let currentGivenPage = 1;
      let hasMoreGiven = true;


      while (hasMoreGiven) {
        const response = await axios.post(
          `${BackendUrl}/api/like/get_likes?page=${currentGivenPage}`,
          {
            SfId: userData.SfId,
            token: token
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );


        if (response.data.code === 0 || response.data.code === "0") {
          const { likesGiven = {} } = response.data.data;
          const givenData = likesGiven.data || [];


          givenData.forEach(item => {
            if (item && item.SfId) {
              allLikedSfIds.add(item.SfId);
            }
          });


          const givenPagination = likesGiven.pagination || {};
          hasMoreGiven = currentGivenPage < (givenPagination.totalPages || 1);
          currentGivenPage++;
        } else {
          hasMoreGiven = false;
        }
      }


      allLikedSfIdsRef.current = allLikedSfIds;
      await fetchLikes(1, false, allLikedSfIds, allDislikedSfIds);


    } catch (error) {
      console.error('Error fetching likes:', error);
      toast.error('Failed to load likes');
      setLoading(false);
    }
  };


  const fetchLikes = async (currentPage = 1, isLoadMore = false, likedSfIdsSet = null, dislikedSfIdsSet = null) => {
    if (isLoadMore) setIsLoadingMore(true);
    else setLoading(true);


    try {
      let userData = userProfile;
      if (!userData) {
        const storedData = localStorage.getItem('userDetails');
        if (storedData) {
          userData = JSON.parse(storedData);
        }
      }
      if (!userData || !userData.SfId) {
        toast.error('User data not found. Please login again.');
        setLoading(false);
        setIsLoadingMore(false);
        return;
      }


      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        setLoading(false);
        setIsLoadingMore(false);
        return;
      }


      const allLikedSfIds = likedSfIdsSet || allLikedSfIdsRef.current;
      const allDislikedSfIds = dislikedSfIdsSet || allDislikedSfIdsRef.current;


      const response = await axios.post(
        `${BackendUrl}/api/like/get_likes?page=${currentPage}`,
        {
          SfId: userData.SfId,
          token: token
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      if (response.data.code === 0 || response.data.code === "0") {
        const { likesReceived = {} } = response.data.data;
        const receivedData = likesReceived.data || [];


        // Filter out liked, disliked profiles AND the excluded SF ID
        const nonMutualAndNotDislikedLikesRaw = receivedData.filter(liker => {
          if (!liker || !liker.SfId) return false;
          const isInLikesGiven = allLikedSfIds.has(liker.SfId);
          const isInDislikes = allDislikedSfIds.has(liker.SfId);
          const isExcluded = liker.SfId === EXCLUDED_SF_ID; // Check if it's the excluded SF ID

          if (isInLikesGiven || isInDislikes || isExcluded) { // Exclude the SF ID
            return false;
          }
          return true;
        });


        const transformedLikes = nonMutualAndNotDislikedLikesRaw.map(liker => {
          const profilePhotos = liker.profilePhoto || [];
          const photoUrls = profilePhotos.map(photo =>
            typeof photo === 'string' ? photo : photo?.url
          ).filter(url => url);
          const profileImage = photoUrls.length > 0
            ? photoUrls[0]
            : 'https://via.placeholder.com/200?text=No+Image';
          return {
            id: liker.id,
            SfId: liker.SfId,
            name: liker.name,
            age: calculateAge(liker.dob),
            gender: liker.gender === 'M' ? 'Male' : 'Female',
            email: liker.email,
            mobile: liker.mobile,
            dob: liker.dob,
            bio: liker.Bio || '',
            rollNo: liker.rollNo || '',
            profileImage: profileImage,
            images: photoUrls.length > 0 ? photoUrls : ['https://via.placeholder.com/500?text=No+Image']
          };
        });


        const receivedPagination = likesReceived.pagination || {};
        const newTotalPages = receivedPagination.totalPages || 1;
        setLikesTotalPages(newTotalPages);


        if (isLoadMore) {
          setLikes(prev => [...prev, ...transformedLikes]);
        } else {
          setLikes(transformedLikes);
        }
        setPage(currentPage);
      } else {
        toast.error(response.data.message || 'Failed to load likes');
        if (!isLoadMore) setLikes([]);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
      let errorMessage = 'Failed to load likes. Please try again.';
      if (error.response?.data) {
        if (error.response.data.error && error.response.data.error.msg) {
          errorMessage = error.response.data.error.msg;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      toast.error(errorMessage);
      if (!isLoadMore) setLikes([]);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };


  const loadMoreLikes = () => {
    if (page >= likesTotalPages || isLoadingMore) return;
    toast.loading('Loading more likes...', { id: 'loading-more-likes' });
    fetchLikes(page + 1, true, allLikedSfIdsRef.current, allDislikedSfIdsRef.current).then(() => toast.dismiss('loading-more-likes'));
  };


  const handleLike = async (profile) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }


      const response = await axios.post(
        `${BackendUrl}/api/like`,
        {
          token: token,
          likerSfId: currentUserSfId,
          likedSfId: profile.SfId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      if (response.data.code === 0 || response.data.code === "0") {
        const message = response.data.message || 'Liked successfully';
        toast.success(message);


        setLikes(likes.filter(like => like.id !== profile.id));
        setExpandedProfile(null);


        allLikedSfIdsRef.current.add(profile.SfId);
      } else {
        const errorMessage = response.data.message || 'Failed to like profile';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error liking profile:', error);


      let errorMessage = 'Failed to like profile';
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error && error.response.data.error.msg) {
          errorMessage = error.response.data.error.msg;
        }
      }


      toast.error(errorMessage);
    }
  };


  const handleDislike = async (profileId) => {
    const profile = likes.find(like => like.id === profileId);
    if (!profile) return;


    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }


      const response = await axios.post(
        `${BackendUrl}/api/dislike`,
        {
          token: token,
          dislikerSfId: currentUserSfId,
          dislikedSfId: profile.SfId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      if (response.data.code === 0 || response.data.code === "0") {
        setLikes(likes.filter(like => like.id !== profileId));
        setExpandedProfile(null);
        allDislikedSfIdsRef.current.add(profile.SfId);
      } else {
        const errorMessage = response.data.message || 'Failed to dislike profile';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error disliking profile:', error);


      let errorMessage = 'Failed to dislike';
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error && error.response.data.error.msg) {
          errorMessage = error.response.data.error.msg;
        }
      }


      toast.error(errorMessage);
    }
  };


  const handleBack = () => {
    setExpandedProfile(null);
  };


  if (loading) {
    return (
      <>
        <style>{`
          .likes-background {
            background-attachment: fixed;
          }
          @media (max-width: 1024px) {
            .likes-background {
              background-position: 50% 40% !important;
            }
          }
        `}</style>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#a91851',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <div
          className="min-h-screen flex items-center justify-center likes-background"
          style={{
            backgroundImage: `url(${homebcg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="text-center bg-white/20 backdrop-blur-md p-8 rounded-3xl border-2 border-white/30">
            <div className="w-16 h-16 border-4 border-[#a91851] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-white drop-shadow-lg">Fetching who likes you...</div>
          </div>
        </div>
      </>
    );
  }


  if (likes.length === 0 && !expandedProfile) {
    return (
      <>
        <style>{`
          .likes-background {
            background-attachment: fixed;
          }
          @media (max-width: 1024px) {
            .likes-background {
              background-position: 50% 40% !important;
            }
          }
        `}</style>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#a91851',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 pb-24 lg:pb-4 likes-background"
          style={{
            backgroundImage: `url(${homebcg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 drop-shadow-lg">
            Likes You
          </h1>


          <div className="text-center p-6 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl max-w-xs mx-4 border-2 border-white/30">
            <div className="mb-4 flex justify-center">
              <svg className="w-32 h-32 drop-shadow-xl" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="120" r="70" fill="url(#circleGradient)" opacity="0.8" />
                <path d="M100 60 Q120 40, 140 60 L100 100 L60 60 Q80 40, 100 60" fill="#a91851" opacity="0.9" />
                <circle cx="70" cy="90" r="8" fill="#8e1645" opacity="0.5" />
                <circle cx="130" cy="90" r="8" fill="#8e1645" opacity="0.5" />
                <path d="M85 110 Q100 120, 115 110" stroke="#8e1645" strokeWidth="3" fill="none" opacity="0.6" />
                <defs>
                  <linearGradient id="circleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ffe8cc', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#ffb088', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#ff8c6b', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>


            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg">
              No new likes
            </h2>
            <p className="text-white text-sm drop-shadow-lg font-medium">
              When someone likes you, you'll see them here.
            </p>
          </div>
        </div>
      </>
    );
  }


  if (expandedProfile) {
    const profile = likes.find(like => like.id === expandedProfile);
    return (
      <>
        <style>{`
          .likes-background {
            background-attachment: fixed;
          }
          @media (max-width: 1024px) {
            .likes-background {
              background-position: 50% 40% !important;
            }
          }


          .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
          }


          .overflow-y-auto::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }


          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #a91851, #d4758f);
            border-radius: 10px;
            border: 2px solid rgba(255, 255, 255, 0.2);
          }


          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #8e1645, #a91851);
            box-shadow: 0 0 8px rgba(169, 24, 81, 0.6);
          }


          .overflow-y-auto {
            scrollbar-width: thin;
            scrollbar-color: #a91851 rgba(255, 255, 255, 0.1);
          }
        `}</style>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#a91851',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />


        <div
          className="flex-1 flex flex-col min-h-screen likes-background"
          style={{
            backgroundImage: `url(${homebcg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="max-w-2xl mx-auto flex justify-between items-center">
              <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                {profile.name}
              </h1>
              <button
                onClick={handleBack}
                className="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-[#a91851]" />
              </button>
            </div>
          </div>


          <div className="flex-1 overflow-y-auto px-4 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto space-y-4"
            >
              <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                <div className="relative">
                  <img
                    src={profile.images[0]}
                    alt={profile.name}
                    className="w-full h-[400px] object-cover select-none"
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    draggable="false"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/500?text=No+Image';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                    <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">
                      {profile.name}
                    </h2>
                  </div>
                </div>
              </div>


              <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 space-y-4 border-2 border-white/30">
                <div>
                  <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#a91851]" />
                    <p className="text-base text-white break-all drop-shadow-lg font-medium">{profile.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Gender</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#a91851]" />
                    <p className="text-base text-white drop-shadow-lg font-medium">{profile.gender}</p>
                  </div>
                </div>
                {profile.rollNo && (
                  <div>
                    <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Roll Number</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#a91851]" />
                      <p className="text-base text-white drop-shadow-lg font-medium">{profile.rollNo}</p>
                    </div>
                  </div>
                )}
              </div>


              {profile.images[1] && (
                <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                  <img
                    src={profile.images[1]}
                    alt={`${profile.name} photo 2`}
                    className="w-full h-[400px] object-cover select-none"
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    draggable="false"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/500?text=No+Image';
                    }}
                  />
                </div>
              )}


              {profile.bio && (
                <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 border-2 border-white/30">
                  <h3 className="text-sm font-semibold text-white/80 mb-2 drop-shadow">About</h3>
                  <p className="text-base text-white leading-relaxed drop-shadow-lg">
                    {profile.bio}
                  </p>
                </div>
              )}


              {profile.images.slice(2).map((image, index) => (
                <div key={`like-profile-img-${index + 2}`} className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                  <img
                    src={image}
                    alt={`${profile.name} photo ${index + 3}`}
                    className="w-full h-[400px] object-cover select-none"
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    draggable="false"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/500?text=No+Image';
                    }}
                  />
                </div>
              ))}
            </motion.div>
          </div>


          <div className="fixed bottom-24 md:bottom-24 left-0 right-0 z-20">
            <div className="max-w-2xl mx-auto flex justify-between items-center px-6">
              <button
                onClick={() => handleDislike(profile.id)}
                className="p-4 md:p-5 rounded-full bg-white/90 backdrop-blur-sm shadow-xl hover:bg-white transition-all active:scale-95 hover:scale-110"
              >
                <X className="w-6 h-6 md:w-8 md:h-8 text-red-500" strokeWidth={2.5} />
              </button>


              <button
                onClick={() => handleLike(profile)}
                className="p-4 md:p-5 rounded-full bg-gradient-to-r from-[#a91851] to-[#8e1645] shadow-xl hover:shadow-2xl transition-all active:scale-95 hover:scale-110"
              >
                <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" strokeWidth={2.5} fill="white" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }


  return (
    <>
      <style>{`
        .likes-background {
          background-attachment: fixed;
        }
        @media (max-width: 1024px) {
          .likes-background {
            background-position: 50% 40% !important;
          }
        }


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
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 2000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#a91851',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div
        className="min-h-screen pb-24 lg:pb-4 likes-background"
        ref={gridRef}
        style={{
          overflowY: 'auto',
          height: '100vh',
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">Likes You</h1>
          <p className="text-white text-sm mb-3 drop-shadow-lg font-medium">{likes.length} {likes.length === 1 ? 'person has' : 'people have'} liked your profile</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 pb-32">
          {likes.map((like) => (
            <motion.div
              key={`like-card-${like.id}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExpandedProfile(like.id)}
              className="relative rounded-2xl overflow-hidden cursor-pointer shadow-xl aspect-[3/4] border-2 border-white/30"
            >
              <img src={like.profileImage} alt={like.name} className="w-full h-full object-cover" onError={e => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }} />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <h3 className="text-white font-semibold text-base lg:text-lg drop-shadow-lg">{like.name}</h3>
              </div>
            </motion.div>
          ))}
        </div>
        {isLoadingMore && (
          <div className="py-4 text-center flex items-center justify-center gap-2 text-white pb-24">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium drop-shadow-lg">Loading more likes...</span>
          </div>
        )}
        {(page >= likesTotalPages && !isLoadingMore && likes.length > 0) && (
          <div className="pt-4 pb-32 text-center text-white/80 text-xs drop-shadow">
            End of likes
          </div>
        )}
      </div>
    </>
  );
}
