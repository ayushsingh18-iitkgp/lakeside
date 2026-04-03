import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Heart, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserProfile } from '../Contexts/UserProfileContext';
import toast, { Toaster } from 'react-hot-toast';
import { useMediaQuery } from '../hooks/useMediaQuery';
import HomeMobile from './HomeMobile';
import HomeDesktop from './HomeDesktop';
import localForage from 'localforage';
import homebcg from '.././finalhome.webp';


const BackendUrl = import.meta.env.VITE_BackendUrl;
const MAX_UNDO_HISTORY = 3;
const EXCLUDED_SF_ID = 'SF000301'; // Define the excluded SF ID


export default function Home() {
  const { userProfile, token: contextToken } = useUserProfile();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animation, setAnimation] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserSfId, setCurrentUserSfId] = useState('');
  const [allProfilesFetched, setAllProfilesFetched] = useState(false);
  const [imagesCached, setImagesCached] = useState(false);


  const [allLikedSfIds, setAllLikedSfIds] = useState(new Set());
  const [allReceivedSfIds, setAllReceivedSfIds] = useState(new Set());
  const [allDislikedSfIds, setAllDislikedSfIds] = useState(new Set());


  const isFetchingRef = useRef(false);
  const likesDataRef = useRef({ liked: new Set(), received: new Set(), disliked: new Set() });


  const isDesktop = useMediaQuery('(min-width: 1024px)');


  useEffect(() => {
    localForage.config({
      name: 'promImageCache',
      storeName: 'images',
      version: 1.0
    });
  }, []);


  useEffect(() => {
    initializeApp();
  }, []);


  useEffect(() => {
    if (profiles.length > 0 && !imagesCached) {
      preloadAllImages();
    }
  }, [profiles, imagesCached]);


  const getAuthToken = () => {
    if (contextToken) return contextToken;
    return localStorage.getItem('User_Token');
  };


  const preloadAllImages = async () => {
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      if (!profile || !profile.images) continue;


      for (let imgIndex = 0; imgIndex < profile.images.length; imgIndex++) {
        const imageUrl = profile.images[imgIndex];
        if (!imageUrl || imageUrl.includes('placeholder')) continue;


        try {
          const cacheKey = `image-${profile.SfId}-${imgIndex}`;


          const cachedBlob = await localForage.getItem(cacheKey);
          if (cachedBlob) {
            continue;
          }


          const response = await fetch(imageUrl, {
            mode: 'cors',
            cache: 'force-cache'
          });


          if (response.ok) {
            const blob = await response.blob();
            await localForage.setItem(cacheKey, blob);
          }
        } catch (error) {
          console.error(`Error preloading image ${imageUrl}:`, error);
        }
      }
    }


    setImagesCached(true);
  };


  const loadImageFromCache = async (sfId, imageIndex) => {
    try {
      const cacheKey = `image-${sfId}-${imageIndex}`;
      const blob = await localForage.getItem(cacheKey);


      if (blob) {
        return URL.createObjectURL(blob);
      }


      const profile = profiles.find(p => p.SfId === sfId);
      return profile?.images?.[imageIndex] || 'https://via.placeholder.com/500?text=No+Image';
    } catch (error) {
      console.error('Error loading image from cache:', error);
      const profile = profiles.find(p => p.SfId === sfId);
      return profile?.images?.[imageIndex] || 'https://via.placeholder.com/500?text=No+Image';
    }
  };


  const initializeApp = async () => {
    setLoading(true);
    try {
      const { likedSet, receivedSet } = await fetchAllLikes();
      const dislikedSet = await fetchAllDislikes();


      likesDataRef.current = { liked: likedSet, received: receivedSet, disliked: dislikedSet };


      setAllLikedSfIds(likedSet);
      setAllReceivedSfIds(receivedSet);
      setAllDislikedSfIds(dislikedSet);


      await fetchAllProfiles(likedSet, receivedSet, dislikedSet);
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoading(false);
    }
  };


  const fetchAllDislikes = async () => {
    const dislikedSfIdsSet = new Set();


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
        return dislikedSfIdsSet;
      }


      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return dislikedSfIdsSet;
      }


      let currentDislikesPage = 1;
      let hasMoreDislikes = true;


      while (hasMoreDislikes) {
        const dislikesResponse = await axios.post(
          `${BackendUrl}/api/dislike/get_dislikes?page=${currentDislikesPage}`,
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


        if (dislikesResponse.data.code === 0 || dislikesResponse.data.code === "0") {
          const responseData = dislikesResponse.data.data;
          const { dislikesGiven = {} } = responseData;


          const givenData = dislikesGiven.data || [];


          givenData.forEach(item => {
            if (item && item.SfId) {
              dislikedSfIdsSet.add(item.SfId);
            }
          });


          const givenPagination = dislikesGiven.pagination || {};
          const givenHasMore = currentDislikesPage < (givenPagination.totalPages || 1);


          hasMoreDislikes = givenHasMore;
          currentDislikesPage++;
        } else {
          console.log('Failed to fetch dislikes, stopping pagination');
          hasMoreDislikes = false;
        }
      }
      return dislikedSfIdsSet;
    } catch (error) {
      console.error('Error fetching dislikes:', error);
      return dislikedSfIdsSet;
    }
  };


  const fetchAllLikes = async () => {
    const likedSfIdsSet = new Set();
    const receivedSfIdsSet = new Set();


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
        return { likedSet: likedSfIdsSet, receivedSet: receivedSfIdsSet };
      }


      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return { likedSet: likedSfIdsSet, receivedSet: receivedSfIdsSet };
      }


      let currentLikesPage = 1;
      let hasMoreLikes = true;


      while (hasMoreLikes) {
        const likesResponse = await axios.post(
          `${BackendUrl}/api/like/get_likes?page=${currentLikesPage}`,
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


        if (likesResponse.data.code === 0 || likesResponse.data.code === "0") {
          const responseData = likesResponse.data.data;
          const { likesGiven = {}, likesReceived = {} } = responseData;


          const givenData = likesGiven.data || [];
          const receivedData = likesReceived.data || [];


          givenData.forEach(item => {
            if (item && item.SfId) {
              likedSfIdsSet.add(item.SfId);
            }
          });


          receivedData.forEach(item => {
            if (item && item.SfId) {
              receivedSfIdsSet.add(item.SfId);
            }
          });


          const givenPagination = likesGiven.pagination || {};
          const receivedPagination = likesReceived.pagination || {};


          const givenHasMore = currentLikesPage < (givenPagination.totalPages || 1);
          const receivedHasMore = currentLikesPage < (receivedPagination.totalPages || 1);


          hasMoreLikes = givenHasMore || receivedHasMore;
          currentLikesPage++;
        } else {
          console.log('Failed to fetch likes, stopping pagination');
          hasMoreLikes = false;
        }
      }


      return { likedSet: likedSfIdsSet, receivedSet: receivedSfIdsSet };
    } catch (error) {
      console.error('Error fetching likes:', error);
      return { likedSet: likedSfIdsSet, receivedSet: receivedSfIdsSet };
    }
  };


  const fetchAllProfiles = async (likedSet = null, receivedSet = null, dislikedSet = null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
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
        isFetchingRef.current = false;
        return;
      }


      setCurrentUserSfId(userData.SfId);


      const userGender = userData.gender?.toLowerCase() || '';
      let isMale = false;


      if (['m', 'male'].includes(userGender)) {
        isMale = true;
      } else if (['f', 'female'].includes(userGender)) {
        isMale = false;
      } else {
        toast.error('Invalid gender data');
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }


      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }


      const likedSfIds = likedSet || likesDataRef.current.liked || allLikedSfIds;
      const receivedSfIds = receivedSet || likesDataRef.current.received || allReceivedSfIds;
      const dislikedSfIds = dislikedSet || likesDataRef.current.disliked || allDislikedSfIds;


      const endpoint = isMale ? '/api/user/get_females' : '/api/user/get_males';


      let allFetchedProfiles = [];
      let currentPage = 1;
      let hasMorePages = true;


      while (hasMorePages) {
        const profilesResponse = await axios.post(
          `${BackendUrl}${endpoint}?page=${currentPage}`,
          {
            token: token
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );


        if (profilesResponse.data.code !== 0 && profilesResponse.data.code !== "0") {
          console.error('Error fetching profiles:', profilesResponse.data);
          break;
        }


        const fetchedProfiles = profilesResponse.data.data || [];
        const paginationData = profilesResponse.data.pagination || {};


        allFetchedProfiles = [...allFetchedProfiles, ...fetchedProfiles];


        hasMorePages = currentPage < (paginationData.totalPages || 1);
        currentPage++;
      }


      // Filter out liked, received, disliked profiles AND the excluded SF ID
      const filteredProfiles = allFetchedProfiles.filter(profile => {
        const sfId = profile.SfId;
        const isLiked = likedSfIds.has(sfId);
        const isReceived = receivedSfIds.has(sfId);
        const isDisliked = dislikedSfIds.has(sfId);
        const isExcluded = sfId === EXCLUDED_SF_ID; // Check if it's the excluded SF ID

        return !isLiked && !isReceived && !isDisliked && !isExcluded; // Exclude the SF ID
      });


      const transformedProfiles = filteredProfiles.map(profile => {
        const profilePhotos = profile.profilePhoto || [];
        const photoUrls = profilePhotos.map(photo =>
          typeof photo === 'string' ? photo : photo?.url
        ).filter(url => url);


        return {
          id: profile.id,
          SfId: profile.SfId,
          name: profile.name,
          email: profile.email,
          mobile: profile.mobile,
          dob: profile.dob,
          age: calculateAge(profile.dob),
          gender: profile.gender === 'M' ? 'Male' : 'Female',
          bio: profile.Bio || '',
          rollNo: profile.rollNo || 'N/A',
          profilePhoto: photoUrls,
          images: photoUrls.length > 0 ? photoUrls : ['https://via.placeholder.com/500?text=No+Image']
        };
      });


      setProfiles(transformedProfiles);
      setAllProfilesFetched(true);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load profiles');
      setProfiles([]);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
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


  const handleLike = async (likedProfile) => {
    try {
      const token = getAuthToken();


      if (!token) {
        console.error('No token found');
        toast.error('Authentication required');
        return;
      }


      const response = await axios.post(
        `${BackendUrl}/api/like`,
        {
          token: token,
          likerSfId: currentUserSfId,
          likedSfId: likedProfile.SfId
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


        const newLikedSet = new Set([...likesDataRef.current.liked, likedProfile.SfId]);
        likesDataRef.current.liked = newLikedSet;
        setAllLikedSfIds(newLikedSet);
      } else {
        console.error('Like error:', response.data);
        const errorMessage = response.data.message || 'Failed to send like';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error liking profile:', error);


      let errorMessage = 'Failed to send like';
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


  const handleDislike = async (dislikedProfile) => {
    try {
      const token = getAuthToken();


      if (!token) {
        console.error('No token found');
        toast.error('Authentication required');
        return;
      }


      const response = await axios.post(
        `${BackendUrl}/api/dislike`,
        {
          token: token,
          dislikerSfId: currentUserSfId,
          dislikedSfId: dislikedProfile.SfId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      if (response.data.code === 0 || response.data.code === "0") {
        const newDislikedSet = new Set([...likesDataRef.current.disliked, dislikedProfile.SfId]);
        likesDataRef.current.disliked = newDislikedSet;
        setAllDislikedSfIds(newDislikedSet);
      } else {
        console.error('Dislike error:', response.data);
        const errorMessage = response.data.message || 'Failed to dislike';
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


  const handleSwipe = (liked) => {
    if (animation !== '') return;


    const currentProfile = profiles[currentIndex];
    const direction = liked ? 'like' : 'dislike';
    setAnimation(direction);


    setHistory(prevHistory => {
      const newHistory = [...prevHistory, { index: currentIndex, profile: currentProfile }];
      return newHistory.slice(-MAX_UNDO_HISTORY);
    });


    if (liked) {
      handleLike(currentProfile);
    } else {
      handleDislike(currentProfile);
    }


    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
      setAnimation('');
    }, 750);
  };


  const handleUndo = () => {
    if (history.length > 0 && animation === '') {
      const lastAction = history[history.length - 1];
      setCurrentIndex(lastAction.index);
      setHistory(history.slice(0, -1));
      setAnimation('');
      toast.info('Undone last action');
    }
  };


  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center pb-20 lg:pb-4 min-h-screen"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-3xl">
          <div className="w-16 h-16 border-4 border-[#a91851] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-[#a91851] mb-2">Loading profiles...</div>
          <div className="text-sm text-[#8e1645]">Finding your perfect matches</div>
        </div>
      </div>
    );
  }


  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <>
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
          className="flex-1 flex items-center justify-center pb-20 lg:pb-4 min-h-screen"
          style={{
            backgroundImage: `url(${homebcg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="text-center p-8 bg-white/20 rounded-3xl backdrop-blur-md shadow-xl max-w-md mx-4 border-2 border-white/30">
            <div className="mb-6 flex justify-center">
              <svg className="w-64 h-64 drop-shadow-lg mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="100" cy="140" rx="60" ry="35" fill="#d4758f" opacity="0.5" />
                <path d="M100 80 L85 120 L70 140 L100 150 L130 140 L115 120 Z" fill="#a91851" />
                <circle cx="100" cy="60" r="20" fill="#ffc4e1" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">No More Profiles</h2>
            <p className="text-white text-base drop-shadow-lg font-medium">You've seen all available profiles. Check back later for new matches!</p>
          </div>
        </div>
      </>
    );
  }


  const currentProfile = profiles[currentIndex];


  return (
    <>
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
        className="flex-1 flex flex-col min-h-screen home-background"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <style>{`
          /* Mobile responsive background - center on Eiffel Tower and couple */
          @media (max-width: 1024px) {
            .home-background {
              background-position: 50% 40% !important;
            }
          }
        `}</style>


        {isDesktop ? (
          <HomeDesktop
            currentProfile={currentProfile}
            animation={animation}
            handleSwipe={handleSwipe}
            handleUndo={handleUndo}
            history={history}
            loadImageFromCache={loadImageFromCache}
          />
        ) : (
          <HomeMobile
            currentProfile={currentProfile}
            animation={animation}
            handleSwipe={handleSwipe}
            handleUndo={handleUndo}
            history={history}
            loadImageFromCache={loadImageFromCache}
          />
        )}


        <AnimatePresence>
          {animation === 'like' && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{
                scale: [0.3, 1, 1.2, 15],
                opacity: [0, 1, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: "easeInOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-32 h-32 text-[#a91851] fill-[#a91851] drop-shadow-2xl" />
            </motion.div>
          )}


          {animation === 'dislike' && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
              animate={{
                scale: [0.3, 1, 1.2, 15],
                opacity: [0, 1, 1, 0],
                rotate: [0, 0, 90, 180]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: "easeInOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="relative bg-[#a91851] rounded-full p-8">
                <X className="w-32 h-32 text-white stroke-[3]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
