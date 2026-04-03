import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Send, MessageCircle, Check, Mail, User, Calendar, Heart, X as XIcon, Bell, MailPlus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useUserProfile } from '../Contexts/UserProfileContext';
import toast, { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import ReCAPTCHA from 'react-google-recaptcha';
import homebcg from '.././finalhome.webp';

const BackendUrl = import.meta.env.VITE_BackendUrl;
const RECAPTCHA_SITE_KEY = '6LcfDKsrAAAAALOedfX8knxtsIJpPqnwQ_h3LdjB';
const EXCLUDED_SF_ID = 'SF000301';

// ----------- Timestamp Formatter Helper -----------
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffInDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function Chats({ onChatStateChange }) {
  const { userProfile, token: contextToken } = useUserProfile();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserSfId, setCurrentUserSfId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReceiverOnline, setIsReceiverOnline] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Invitation states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalType, setInviteModalType] = useState('send');
  const [userProfileData, setUserProfileData] = useState(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);

  // Invitations data from /api/invitation/get
  const [invitationsSent, setInvitationsSent] = useState([]);
  const [invitationsReceived, setInvitationsReceived] = useState([]);

  // Notifications states
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [showInvitationDetailModal, setShowInvitationDetailModal] = useState(false);

  // Email Invite Modal states
  const [showEmailInviteModal, setShowEmailInviteModal] = useState(false);
  const [emailInviteData, setEmailInviteData] = useState({
    name: '',
    email: '',
    gender: '',
  });
  const [emailInviteErrors, setEmailInviteErrors] = useState({});
  const [captchaToken, setCaptchaToken] = useState(null);
  const [isSendingEmailInvite, setIsSendingEmailInvite] = useState(false);
  const recaptchaRef = useRef(null);

  // Pagination for matches
  const [chatsPage, setChatsPage] = useState(1);
  const [chatsTotalPages, setChatsTotalPages] = useState(1);
  const [isLoadingMoreMatches, setIsLoadingMoreMatches] = useState(false);

  // Pagination for messages
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(1);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const selectedChatRef = useRef(null);
  const currentUserSfIdRef = useRef(null);
  const chatsListRef = useRef(null);
  const inputRef = useRef(null);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    currentUserSfIdRef.current = currentUserSfId;
  }, [currentUserSfId]);

  useEffect(() => {
    fetchMatches(1);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchInvitations();
  }, []);

  // Keyboard height tracking for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const calculatedKeyboardHeight = windowHeight - viewportHeight;
        setKeyboardHeight(calculatedKeyboardHeight > 0 ? calculatedKeyboardHeight : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    if (shouldScrollRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange(!!selectedChat);
    }
  }, [selectedChat, onChatStateChange]);

  useEffect(() => {
    const handleScroll = () => {
      if (!chatsListRef.current || isLoadingMoreMatches || chatsPage >= chatsTotalPages) return;
      const { scrollTop, scrollHeight, clientHeight } = chatsListRef.current;
      if (scrollHeight - scrollTop - clientHeight < 80) {
        loadMoreMatches();
      }
    };
    const listElem = chatsListRef.current;
    if (listElem) {
      listElem.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (listElem) {
        listElem.removeEventListener('scroll', handleScroll);
      }
    };
  }, [chatsPage, chatsTotalPages, isLoadingMoreMatches, chats.length]);

  useEffect(() => {
    const handleMessagesScroll = () => {
      if (!messagesContainerRef.current || isLoadingMoreMessages || messagesPage >= messagesTotalPages) return;
      const { scrollTop } = messagesContainerRef.current;
      if (scrollTop < 50) {
        shouldScrollRef.current = false;
        loadMoreMessages();
      }
    };
    const messagesElem = messagesContainerRef.current;
    if (messagesElem) {
      messagesElem.addEventListener('scroll', handleMessagesScroll);
    }
    return () => {
      if (messagesElem) {
        messagesElem.removeEventListener('scroll', handleMessagesScroll);
      }
    };
  }, [messagesPage, messagesTotalPages, isLoadingMoreMessages, selectedChat]);

  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current && (shouldScrollRef.current || force)) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 300);
  };

  const [myisInvited, setmyIsInvited] = useState(false);

  const getAuthToken = () => {
    if (contextToken) return contextToken;
    return localStorage.getItem('User_Token');
  };

  // Fetch user profile from /api/get_profile (only for myisInvited status)
  const fetchUserProfile = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      let userData = userProfile;
      if (!userData) {
        const storedData = localStorage.getItem('userDetails');
        if (storedData) userData = JSON.parse(storedData);
      }
      if (!userData || !userData.SfId) return;

      const response = await axios.post(
        `${BackendUrl}/api/get_profile`,
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
        setUserProfileData(response.data.data);
        if (response.data.data.isInvited === true) {
          console.log(response.data.data.isInvited);
          setmyIsInvited(true);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch invitations from /api/invitation/get
  const fetchInvitations = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      let userData = userProfile;
      if (!userData) {
        const storedData = localStorage.getItem('userDetails');
        if (storedData) userData = JSON.parse(storedData);
      }
      if (!userData || !userData.SfId) return;

      const response = await axios.post(
        `${BackendUrl}/api/invitation/get`,
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
        const sentArray = Array.isArray(response.data.invitesSent) ? response.data.invitesSent : [];
        const receivedArray = Array.isArray(response.data.invitesReceived) ? response.data.invitesReceived : [];

        setInvitationsSent(sentArray);
        setInvitationsReceived(receivedArray);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const getInvitationButtonState = () => {
    // Check if user is already matched (locked) - ONLY check myisInvited
    if (userProfileData && myisInvited === true) {
      return { type: 'locked', disabled: true };
    }

    if (!selectedChat) return { type: 'send', disabled: false };

    // Check if invitation received from this person - from invitation/get
    const hasReceivedInvite = invitationsReceived.some(
      inv => inv.SfId === selectedChat.SfId || inv.email === selectedChat.email
    );

    // Check if invitation sent to this person - from invitation/get
    const hasSentInvite = invitationsSent.some(
      inv => inv.SfId === selectedChat.SfId || inv.email === selectedChat.email
    );

    if (hasReceivedInvite) {
      return { type: 'accept', disabled: false };
    } else if (hasSentInvite) {
      return { type: 'pending', disabled: true };
    } else {
      return { type: 'send', disabled: false };
    }
  };

  const handleInviteClick = () => {
    const buttonState = getInvitationButtonState();

    // If user is already matched, show locked modal
    if (buttonState.type === 'locked') {
      setInviteModalType('locked');
      setShowInviteModal(true);
      return;
    }

    // Set the correct modal type and show it
    setInviteModalType(buttonState.type);
    setShowInviteModal(true);
  };

  const handleEmailInviteClick = () => {
    // Check if user is already matched
    if (userProfileData && myisInvited === true) {
      // Show "Already Matched" modal
      setInviteModalType('locked');
      setShowInviteModal(true);
    } else {
      setShowEmailInviteModal(true);
    }
  };

  const handleSendInvitation = async () => {
    setIsProcessingInvite(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await axios.post(
        `${BackendUrl}/api/invitation/send`,
        {
          token: token,
          senderSfId: currentUserSfId,
          receiverSfId: selectedChat.SfId,
          senderEmail: userProfile?.email || '',
          receiverEmail: selectedChat.email
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'Your invitation is sent');
        setShowInviteModal(false);
        await fetchUserProfile();
        await fetchInvitations();
      } else {
        toast.error(response.data.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleAcceptInvitation = async (invitation = null) => {
    const inviteToAccept = invitation || selectedChat;
    if (!inviteToAccept) return;

    setIsProcessingInvite(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await axios.post(
        `${BackendUrl}/api/invitation/accept`,
        {
          token: token,
          receiverSfId: currentUserSfId,
          senderSfId: inviteToAccept.SfId,
          senderEmail: userProfile?.email,
          receiverEmail: inviteToAccept.email
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || "You have accepted an invitation. You can't accept any other invitations");
        setShowInviteModal(false);
        setShowInvitationDetailModal(false);
        setShowNotificationsModal(false);
        await fetchUserProfile();
        await fetchInvitations();
      } else {
        toast.error(response.data.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept invitation';
      toast.error(errorMessage);
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleDeclineInvitation = async (invitation = null) => {
    const inviteToDecline = invitation || selectedChat;
    if (!inviteToDecline) return;

    setIsProcessingInvite(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await axios.post(
        `${BackendUrl}/api/invitation/decline`,
        {
          token: token,
          receiverSfId: currentUserSfId,
          senderSfId: inviteToDecline.SfId,
          senderEmail: userProfile?.email,
          receiverEmail: inviteToDecline.email
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'Invitation declined');
        setShowInviteModal(false);
        setShowInvitationDetailModal(false);
        setShowNotificationsModal(false);
        await fetchUserProfile();
        await fetchInvitations();
      } else {
        toast.error(response.data.message || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      const errorMessage = error.response?.data?.message || 'Failed to decline invitation';
      toast.error(errorMessage);
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleViewInvitation = (invitation) => {
    setSelectedInvitation(invitation);
    setShowInvitationDetailModal(true);
  };

  // Email Invite Modal Functions
  const handleEmailInviteChange = (e) => {
    const { name, value } = e.target;
    setEmailInviteData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (emailInviteErrors[name]) {
      setEmailInviteErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmailInvite = () => {
    const errors = {};

    // Name validation
    if (!emailInviteData.name.trim()) {
      errors.name = 'Name is required';
    } else if (emailInviteData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!emailInviteData.email) {
      errors.email = 'Email is required';
    } else if (!emailInviteData.email.endsWith('@kgpian.iitkgp.ac.in')) {
      errors.email = 'Only @kgpian.iitkgp.ac.in emails are allowed';
    } else {
      const emailRegex = /^[a-zA-Z0-9._-]+@kgpian\.iitkgp\.ac\.in$/;
      if (!emailRegex.test(emailInviteData.email)) {
        errors.email = 'Invalid email format. Use format: username@kgpian.iitkgp.ac.in';
      }
    }

    // Gender validation
    if (!emailInviteData.gender) {
      errors.gender = 'Gender is required';
    }

    // Captcha validation
    if (!captchaToken) {
      errors.captcha = 'Please complete the reCAPTCHA';
    }

    setEmailInviteErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendEmailInvite = async () => {
    if (!validateEmailInvite()) {
      toast.error('Please fix the errors before sending');
      return;
    }

    setIsSendingEmailInvite(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await axios.post(
        `${BackendUrl}/api/invitation/outside`,
        {
          token: token,
          senderSfId: currentUserSfId,
          senderEmail: userProfile?.email || '',
          receiverEmail: emailInviteData.email,
          name: emailInviteData.name,
          gender: emailInviteData.gender,
          captcha: captchaToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'Invitation sent successfully via email!');
        setShowEmailInviteModal(false);
        // Reset form
        setEmailInviteData({ name: '', email: '', gender: '' });
        setCaptchaToken(null);
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
      } else {
        toast.error(response.data.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending email invitation:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setIsSendingEmailInvite(false);
    }
  };

  const handleCancelEmailInvite = () => {
    setShowEmailInviteModal(false);
    setEmailInviteData({ name: '', email: '', gender: '' });
    setEmailInviteErrors({});
    setCaptchaToken(null);
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    if (emailInviteErrors.captcha) {
      setEmailInviteErrors(prev => ({ ...prev, captcha: '' }));
    }
  };

  const initializeSocket = (userSfId, userName) => {
    const token = getAuthToken();
    if (!token) return;
    socketRef.current = io(BackendUrl, {
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => setIsSocketConnected(true));
    socketRef.current.on('receive_message', (data) => {
      const currentSelectedChat = selectedChatRef.current;
      const currentUserId = currentUserSfIdRef.current;
      if (currentSelectedChat && data.authorSfId === currentSelectedChat.SfId) setIsReceiverOnline(true);
      if (currentSelectedChat &&
        ((data.authorSfId === currentSelectedChat.SfId && data.receiverSfId === currentUserId) ||
          (data.authorSfId === currentUserId && data.receiverSfId === currentSelectedChat.SfId))) {
        const newMessage = {
          id: data.chatId || `socket-${Date.now()}-${Math.random()}`,
          text: data.content,
          sender: data.authorSfId === currentUserId ? 'me' : 'them',
          timestamp: formatTimestamp(new Date()),
          createdAt: new Date().toISOString(),
          delivered: true
        };
        setMessages(prev => {
          const exists = prev.some(msg =>
            msg.id === newMessage.id ||
            (msg.text === newMessage.text && msg.sender === newMessage.sender && msg.timestamp === newMessage.timestamp)
          );
          if (exists) return prev;
          shouldScrollRef.current = true;
          return [...prev, newMessage];
        });
      }
    });
    socketRef.current.on('user_online', (data) => {
      if (selectedChatRef.current && data.SfId === selectedChatRef.current.SfId) setIsReceiverOnline(true);
    });
    socketRef.current.on('user_offline', (data) => {
      if (selectedChatRef.current && data.SfId === selectedChatRef.current.SfId) setIsReceiverOnline(false);
    });
    socketRef.current.on('disconnect', () => {
      setIsSocketConnected(false);
      setIsReceiverOnline(false);
    });
    socketRef.current.on('connect_error', () => setIsSocketConnected(false));
  };

  const removeDuplicatesBySfId = (array) => {
    const seen = new Map();
    array.forEach(item => {
      if (!seen.has(item.SfId)) {
        seen.set(item.SfId, item);
      }
    });
    return Array.from(seen.values());
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

  // UPDATED: Fetch matches using /api/mymatches
  const fetchMatches = async (page = 1, loadMore = false) => {
    if (loadMore && isLoadingMoreMatches) return;

    if (loadMore) setIsLoadingMoreMatches(true);
    else setLoading(true);

    try {
      let userData = userProfile;
      if (!userData) {
        const storedData = localStorage.getItem('userDetails');
        if (storedData) userData = JSON.parse(storedData);
      }
      if (!userData || !userData.SfId) {
        toast.error('User data not found. Please login again.');
        setLoading(false);
        setIsLoadingMoreMatches(false);
        return;
      }
      setCurrentUserSfId(userData.SfId);
      setCurrentUserName(userData.name || '');

      if (page === 1 && !loadMore) initializeSocket(userData.SfId, userData.name || '');

      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found.');
        setLoading(false);
        setIsLoadingMoreMatches(false);
        return;
      }

      // NEW: Use /api/mymatches with POST request
      const response = await axios.post(
        `${BackendUrl}/api/mymatches`,
        {
          SfId: userData.SfId,
          email: userData.email,
          token: token,
          page: page // Send as integer
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        const mutualMatches = response.data.data?.mutualMatches || {};
        const matchesData = mutualMatches.data || [];
        const pagination = mutualMatches.pagination || {};
        // Filter out the excluded SF ID before transforming
        const filteredMatchesData = matchesData.filter(match => match.SfId !== EXCLUDED_SF_ID);

        const transformedChats = filteredMatchesData.map(match => {
          const profilePhotos = match.profilePhoto || [];
          let profileImage = 'https://via.placeholder.com/200?text=No+Image';
          if (profilePhotos.length > 0) {
            const firstPhoto = profilePhotos[0];
            profileImage = typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.url;
          }

          const photoUrls = profilePhotos.map(photo =>
            typeof photo === 'string' ? photo : photo?.url
          ).filter(url => url);

          return {
            id: match.id,
            SfId: match.SfId,
            name: match.name,
            email: match.email,
            mobile: match.mobile,
            dob: match.dob,
            age: calculateAge(match.dob),
            gender: match.gender === 'M' ? 'Male' : 'Female',
            rollNo: match.rollNo || '',
            profileImage: profileImage || 'https://via.placeholder.com/200?text=No+Image',
            bio: match.Bio || '',
            images: photoUrls.length > 0 ? photoUrls : ['https://via.placeholder.com/500?text=No+Image']
          };
        });

        setChatsTotalPages(pagination.totalPages || 1);

        if (loadMore) {
          setChats(prev => {
            const combined = [...prev, ...transformedChats];
            return removeDuplicatesBySfId(combined);
          });
        } else {
          setChats(transformedChats);
        }
        setChatsPage(page);
      } else {
        toast.error(response.data.message || 'Failed to load matches');
        if (!loadMore) setChats([]);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      let errorMessage = 'Failed to load matches. Please try again.';
      if (error.response?.data) {
        if (error.response.data.error && error.response.data.error.msg) {
          errorMessage = error.response.data.error.msg;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      toast.error(errorMessage);
      if (!loadMore) setChats([]);
    } finally {
      setLoading(false);
      setIsLoadingMoreMatches(false);
    }
  };

  const loadMoreMatches = () => {
    if (chatsPage >= chatsTotalPages || isLoadingMoreMatches) return;
    fetchMatches(chatsPage + 1, true);
  };

  // FIXED: Messages fetching with proper ordering
  const fetchMessages = async (senderSfId, receiverSfId, page = 1, loadMore = false) => {
    if (loadMore) setIsLoadingMoreMessages(true);

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const container = messagesContainerRef.current;
      const scrollHeightBefore = container?.scrollHeight || 0;

      const response = await axios.post(
        `${BackendUrl}/api/messages/get_messages?page=${page}`,
        {
          token: token,
          senderSfId: senderSfId,
          receiverSfId: receiverSfId
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        const fetchedMessages = response.data.data || [];
        const pagination = response.data.pagination || {};

        setMessagesTotalPages(pagination.totalPages || 1);

        // Transform messages with proper timestamp
        const transformedMessages = fetchedMessages.map(msg => ({
          id: `${msg.chatId}-${msg.createdAt}`,
          text: msg.content,
          sender: msg.senderSfId === currentUserSfId ? 'me' : 'them',
          timestamp: formatTimestamp(msg.createdAt),
          createdAt: msg.createdAt, // Keep original timestamp for sorting
          senderName: msg.sender?.name,
          receiverName: msg.receiver?.name,
          delivered: true
        }));

        if (loadMore) {
          // When loading more (older messages), add them to the beginning
          setMessages(prev => {
            // Combine and sort by createdAt ascending (oldest first in array)
            const combined = [...transformedMessages, ...prev];
            const sorted = combined.sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            return sorted;
          });

          // Maintain scroll position after loading older messages
          setTimeout(() => {
            if (container) {
              const scrollHeightAfter = container.scrollHeight;
              container.scrollTop = scrollHeightAfter - scrollHeightBefore;
            }
          }, 50);
        } else {
          // Initial load: sort messages by time ascending (oldest to newest)
          const sortedMessages = transformedMessages.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setMessages(sortedMessages);
          shouldScrollRef.current = true;
        }
        setMessagesPage(page);
      } else {
        if (!loadMore) setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (!loadMore) setMessages([]);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  const loadMoreMessages = () => {
    if (messagesPage >= messagesTotalPages || isLoadingMoreMessages || !selectedChat) return;
    const nextPage = messagesPage + 1;
    fetchMessages(currentUserSfId, selectedChat.SfId, nextPage, true);
  };

  const openChat = (chat) => {
    setSelectedChat(chat);
    setIsReceiverOnline(false);
    setMessages([]);
    setMessagesPage(1);
    setMessagesTotalPages(1);
    setShowProfile(false);
    shouldScrollRef.current = true;
    fetchMessages(currentUserSfId, chat.SfId, 1, false);
  };

  const closeChat = () => {
    setSelectedChat(null);
    setMessages([]);
    setMessage('');
    setIsSending(false);
    setIsReceiverOnline(false);
    setMessagesPage(1);
    setMessagesTotalPages(1);
    setShowProfile(false);
    setProfileData(null);
    shouldScrollRef.current = true;
  };

  const handleProfileClick = () => {
    if (selectedChat) {
      setProfileData(selectedChat);
      setShowProfile(true);
    }
  };

  const closeProfile = () => {
    setShowProfile(false);
    setProfileData(null);
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat || isSending) return;
    setIsSending(true);

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMessage = {
      id: tempId,
      text: message,
      sender: 'me',
      timestamp: formatTimestamp(new Date()),
      createdAt: new Date().toISOString(),
      delivered: false
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = message;
    setMessage('');
    shouldScrollRef.current = true;

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Authentication token not found');
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setIsSending(false);
        return;
      }

      const messageData = {
        content: messageToSend,
        receiverSfId: selectedChat.SfId,
        authorSfId: currentUserSfId,
        authorName: currentUserName
      };

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_message', messageData);
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? { ...msg, delivered: true } : msg
        ));
        setIsSending(false);
      } else {
        const response = await axios.post(
          `${BackendUrl}/api/messages/send_messages`,
          {
            token: token,
            content: messageToSend,
            senderSfId: currentUserSfId,
            receiverSfId: selectedChat.SfId
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data.code === 0 || response.data.code === "0") {
          setMessages(prev => prev.map(msg =>
            msg.id === tempId ? {
              ...msg,
              delivered: true,
              text: response.data.data.content, // <--- THIS updates the UI to show **** if masked
              id: `${response.data.data?.chatId || tempId}-${Date.now()}`
            } : msg
          ));
          setIsSending(false);
        } else {
          toast.error(response.data.message || 'Failed to send message');
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          setIsSending(false);
        }
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    return false;
  };

  if (loading) {
    return (
      <div
        className="min-h-screen pb-24 lg:pb-4 overflow-auto"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#ffe8cc'
        }}
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/20 backdrop-blur-md p-8 rounded-3xl border-2 border-white/30">
            <div className="w-16 h-16 border-4 border-[#a91851] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-white drop-shadow-lg mb-2">Loading matches...</div>
            <div className="text-sm text-white/80 drop-shadow-lg">Finding your perfect matches</div>
          </div>
        </div>
      </div>
    );
  }

  if (chats.length === 0 && !selectedChat) {
    return (
      <>
        <style>{`
          /* Mobile responsive background */
          @media (max-width: 1024px) {
            .chats-background {
              background-position: center center !important;
              background-size: cover !important;
            }
          }

          /* Custom Elegant Scrollbar */
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
          className="min-h-screen pb-24 lg:pb-4 overflow-auto chats-background"
          style={{
            backgroundImage: `url(${homebcg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#ffe8cc'
          }}
        >
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

          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Matches</h1>
              <div className="flex items-center gap-2">
                {/* Email Invite Button */}
                <button
                  onClick={handleEmailInviteClick}
                  disabled={userProfileData && myisInvited === true}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                >
                  <Mail className="w-5 h-5 text-white" />
                  <span className="text-sm font-semibold text-white drop-shadow">Invite</span>
                </button>
                {/* Notification Bell */}
                <button
                  onClick={() => setShowNotificationsModal(true)}
                  className="relative p-2 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors border border-white/30"
                >
                  <Bell className="w-6 h-6 text-white" />
                  {invitationsReceived.length > 0 && myisInvited === false && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {invitationsReceived.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center px-6 min-h-[70vh]">
            <div className="text-center bg-white/20 backdrop-blur-md p-6 rounded-2xl border-2 border-white/30 shadow-xl max-w-xs mx-4">
              <div className="mb-4">
                <svg className="w-48 h-48 drop-shadow-lg mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="100" cy="140" rx="60" ry="35" fill="#d4758f" opacity="0.5" />
                  <path d="M100 80 L85 120 L70 140 L100 150 L130 140 L115 120 Z" fill="#a91851" />
                  <circle cx="100" cy="60" r="20" fill="#ffc4e1" />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg">No matches yet</h2>
              <p className="text-white text-sm drop-shadow-lg font-medium">When a like is mutual, you'll be able to chat here.</p>
            </div>
          </div>

          {/* Email Invite Modal */}
          <AnimatePresence>
            {showEmailInviteModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4"
                onClick={handleCancelEmailInvite}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Invite to Prom via Email</h2>
                    <p className="text-sm text-white/80 drop-shadow">Send a prom invitation to someone outside the platform</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white drop-shadow mb-2">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={emailInviteData.name}
                        onChange={handleEmailInviteChange}
                        placeholder="Enter name"
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a91851] bg-white/90 backdrop-blur-sm ${emailInviteErrors.name ? 'border-red-500' : 'border-white/30'
                          }`}
                      />
                      {emailInviteErrors.name && (
                        <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white drop-shadow mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={emailInviteData.email}
                        onChange={handleEmailInviteChange}
                        placeholder="example@email.com"
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a91851] bg-white/90 backdrop-blur-sm ${emailInviteErrors.email ? 'border-red-500' : 'border-white/30'
                          }`}
                      />
                      {emailInviteErrors.email && (
                        <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white drop-shadow mb-2">Gender *</label>
                      <select
                        name="gender"
                        value={emailInviteData.gender}
                        onChange={handleEmailInviteChange}
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a91851] bg-white/90 backdrop-blur-sm ${emailInviteErrors.gender ? 'border-red-500' : 'border-white/30'
                          }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                      {emailInviteErrors.gender && (
                        <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.gender}</p>
                      )}
                    </div>

                    <div className="flex justify-center">
                      <div>
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={RECAPTCHA_SITE_KEY}
                          onChange={handleCaptchaChange}
                        />
                        {emailInviteErrors.captcha && (
                          <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.captcha}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleCancelEmailInvite}
                      disabled={isSendingEmailInvite}
                      className="flex-1 bg-white/80 text-gray-700 font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmailInvite}
                      disabled={isSendingEmailInvite}
                      className="flex-1 bg-[#a91851] text-white font-semibold py-3 rounded-lg hover:bg-[#8e1645] transition-colors disabled:opacity-50"
                    >
                      {isSendingEmailInvite ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications Modal */}
          <AnimatePresence>
            {showNotificationsModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4"
                onClick={() => setShowNotificationsModalfalse()}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-white/20">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">Prom Invitations</h2>
                      <button
                        onClick={() => setShowNotificationsModal(false)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <XIcon className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    {/* Conditional subtitle based on myisInvited status */}
                    {userProfileData && myisInvited === true ? (
                      <p className="text-sm text-white/80 drop-shadow mt-1">
                        You are already matched
                      </p>
                    ) : (
                      <p className="text-sm text-white/80 drop-shadow mt-1">
                        You have {invitationsReceived.length} invitation{invitationsReceived.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Invitations List */}
                  {console.log('myisInvited va:', myisInvited)}
                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Check if user is already matched */}
                    {myisInvited === true ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                          <Heart className="w-8 h-8 text-gray-400" fill="#9ca3af" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Already Matched!</h3>
                        <p className="text-white drop-shadow-lg px-4">
                          You have already accepted a prom invitation and are matched with someone.
                          You cannot view or accept any more invitations.
                        </p>
                      </div>
                    ) : invitationsReceived.length === 0 ? (
                      <div className="text-center py-8 text-white">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-white/50 drop-shadow-lg" />
                        <p className="drop-shadow-lg">No invitations received</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invitationsReceived.map((invitation, index) => (
                          <div
                            key={`invitation-${invitation.SfId}-${index}`}
                            className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-semibold text-white drop-shadow-lg">{invitation.name}</p>
                                <p className="text-sm text-white/80 drop-shadow">{invitation.email}</p>
                              </div>
                              <button
                                onClick={() => handleViewInvitation(invitation)}
                                className="ml-3 px-4 py-2 bg-[#a91851] text-white font-semibold rounded-lg hover:bg-[#8e1645] transition-colors text-sm"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invitation Detail Modal */}
          <AnimatePresence>
            {showInvitationDetailModal && selectedInvitation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4"
                onClick={() => setShowInvitationDetailModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
                >
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                      <Heart className="w-8 h-8 text-[#a91851]" fill="#a91851" />
                    </div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Accept Prom Invite?</h2>
                    <p className="text-white drop-shadow-lg">
                      <span className="font-semibold">{selectedInvitation.name}</span> has invited you to prom!
                      <span className="block mt-2 text-sm text-white/80 font-bold">
                        Note: You can only accept one invitation. After accepting, you'll be matched with this person.
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDeclineInvitation(selectedInvitation)}
                      disabled={isProcessingInvite}
                      className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isProcessingInvite ? 'Processing...' : 'Decline'}
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(selectedInvitation)}
                      disabled={isProcessingInvite}
                      className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isProcessingInvite ? 'Processing...' : 'Accept'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invitation Modal */}
          <AnimatePresence>
            {showInviteModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
                onClick={() => setShowInviteModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
                >
                  {inviteModalType === 'locked' ? (
                    <>
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                          <Heart className="w-8 h-8 text-gray-400" fill="#9ca3af" />
                        </div>
                        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Already Matched!</h2>
                        <p className="text-white drop-shadow-lg">
                          You have already accepted a prom invitation and are matched with someone. You cannot send or accept any more invitations.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="w-full bg-[#a91851] text-white font-semibold py-3 rounded-lg hover:bg-[#8e1645] transition-colors"
                      >
                        Okay
                      </button>
                    </>
                  ) : inviteModalType === 'pending' ? (
                    <>
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                          <Heart className="w-8 h-8 text-yellow-500" fill="#eab308" />
                        </div>
                        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Invitation Pending</h2>
                        <p className="text-white drop-shadow-lg">
                          You have already sent a prom invitation to <span className="font-semibold">{selectedChat?.name}</span>.
                          <span className="block mt-2 text-sm text-white/80">
                            Please wait for them to accept or decline your invitation.
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="w-full bg-[#a91851] text-white font-semibold py-3 rounded-lg hover:bg-[#8e1645] transition-colors"
                      >
                        Okay
                      </button>
                    </>
                  ) : inviteModalType === 'accept' ? (
                    <>
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                          <Heart className="w-8 h-8 text-green-600" fill="#16a34a" />
                        </div>
                        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Accept Prom Invite?</h2>
                        <p className="text-white drop-shadow-lg">
                          <span className="font-semibold">{selectedChat?.name}</span> has invited you to prom!
                          <span className="block mt-2 text-sm text-white/80">
                            Note: You can only accept one invitation. After accepting, you'll be matched with this person.
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDeclineInvitation()}
                          disabled={isProcessingInvite}
                          className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {isProcessingInvite ? 'Processing...' : 'Decline'}
                        </button>
                        <button
                          onClick={() => handleAcceptInvitation()}
                          disabled={isProcessingInvite}
                          className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {isProcessingInvite ? 'Processing...' : 'Accept'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                          <Heart className="w-8 h-8 text-[#a91851]" fill="#a91851" />
                        </div>
                        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Invite to Prom?</h2>
                        <p className="text-white drop-shadow-lg">
                          Send a prom invitation to <span className="font-semibold">{selectedChat?.name}</span>?
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowInviteModal(false)}
                          disabled={isProcessingInvite}
                          className="flex-1 bg-white/80 text-gray-700 font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendInvitation}
                          disabled={isProcessingInvite}
                          className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {isProcessingInvite ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  }

  const buttonState = getInvitationButtonState();

  return (
    <>
      <style>{`
        /* Mobile responsive background */
        @media (max-width: 1024px) {
          .chats-background {
            background-position: center center !important;
            background-size: cover !important;
          }
        }

        /* Custom Elegant Scrollbar */
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
        className="min-h-screen pb-24 lg:pb-4 overflow-auto chats-background"
        style={{
          backgroundImage: `url(${homebcg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#ffe8cc'
        }}
      >
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 3000,
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

        {/* All Modals */}
        {/* Email Invite Modal */}
        <AnimatePresence>
          {showEmailInviteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4"
              onClick={handleCancelEmailInvite}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Invite to Prom via Email</h2>
                  <p className="text-sm text-white/80 drop-shadow">Send a prom invitation to someone outside the platform</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white drop-shadow mb-2">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={emailInviteData.name}
                      onChange={handleEmailInviteChange}
                      placeholder="Enter name"
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a91851] bg-white/90 backdrop-blur-sm ${emailInviteErrors.name ? 'border-red-500' : 'border-white/30'
                        }`}
                    />
                    {emailInviteErrors.name && (
                      <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white drop-shadow mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={emailInviteData.email}
                      onChange={handleEmailInviteChange}
                      placeholder="example@email.com"
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a91851] bg-white/90 backdrop-blur-sm ${emailInviteErrors.email ? 'border-red-500' : 'border-white/30'
                        }`}
                    />
                    {emailInviteErrors.email && (
                      <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white drop-shadow mb-2">Gender *</label>
                    <select
                      name="gender"
                      value={emailInviteData.gender}
                      onChange={handleEmailInviteChange}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a91851] bg-white/90 backdrop-blur-sm ${emailInviteErrors.gender ? 'border-red-500' : 'border-white/30'
                        }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                    {emailInviteErrors.gender && (
                      <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.gender}</p>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div>
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={RECAPTCHA_SITE_KEY}
                        onChange={handleCaptchaChange}
                      />
                      {emailInviteErrors.captcha && (
                        <p className="text-red-200 text-xs mt-1 drop-shadow">{emailInviteErrors.captcha}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCancelEmailInvite}
                    disabled={isSendingEmailInvite}
                    className="flex-1 bg-white/80 text-gray-700 font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmailInvite}
                    disabled={isSendingEmailInvite}
                    className="flex-1 bg-[#a91851] text-white font-semibold py-3 rounded-lg hover:bg-[#8e1645] transition-colors disabled:opacity-50"
                  >
                    {isSendingEmailInvite ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications Modal */}
        <AnimatePresence>
          {showNotificationsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
              onClick={() => setShowNotificationsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-white/20">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">Prom Invitations</h2>
                    <button
                      onClick={() => setShowNotificationsModal(false)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <XIcon className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  {myisInvited === true ?
                    <p className="text-sm-800 text-white/80 drop-shadow mt-1 font-bold">
                      You are already matched
                    </p>
                    : <p className="text-sm text-white/80 drop-shadow mt-1">
                      You have {invitationsReceived.length} invitation{invitationsReceived.length !== 1 ? 's' : ''}
                    </p>}
                </div>
                {myisInvited === true ? (
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                        <Heart className="w-8 h-8 text-gray-400" fill="#9ca3af" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Already Matched!</h3>
                      <p className="text-white drop-shadow-lg px-4">
                        You have already accepted a prom invitation and are matched with someone.
                        You cannot view or accept any more invitations.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4">
                    {invitationsReceived.length === 0 ? (
                      <div className="text-center py-8 text-white">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-white/50 drop-shadow-lg" />
                        <p className="drop-shadow-lg">No invitations received</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invitationsReceived.map((invitation, index) => (
                          <div
                            key={`invitation-${invitation.SfId}-${index}`}
                            className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-semibold text-white drop-shadow-lg">{invitation.name}</p>
                                <p className="text-sm text-white/80 drop-shadow">{invitation.email}</p>
                              </div>
                              <button
                                onClick={() => handleViewInvitation(invitation)}
                                className="ml-3 px-4 py-2 bg-[#a91851] text-white font-semibold rounded-lg hover:bg-[#8e1645] transition-colors text-sm"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invitation Detail Modal */}
        <AnimatePresence>
          {showInvitationDetailModal && selectedInvitation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4"
              onClick={() => setShowInvitationDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                    <Heart className="w-8 h-8 text-[#a91851]" fill="#a91851" />
                  </div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Accept Prom Invite?</h2>
                  <p className="text-white drop-shadow-lg">
                    <span className="font-semibold">{selectedInvitation.name}</span> has invited you to prom!
                    <span className="block mt-2 text-sm text-white/80 font-bold">
                      Note: You can only accept one invitation. After accepting, you'll be matched with this person.
                    </span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDeclineInvitation(selectedInvitation)}
                    disabled={isProcessingInvite}
                    className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isProcessingInvite ? 'Processing...' : 'Decline'}
                  </button>
                  <button
                    onClick={() => handleAcceptInvitation(selectedInvitation)}
                    disabled={isProcessingInvite}
                    className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessingInvite ? 'Processing...' : 'Accept'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invitation Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowInviteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
              >
                {inviteModalType === 'locked' ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                        <Heart className="w-8 h-8 text-gray-400" fill="#9ca3af" />
                      </div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Already Matched!</h2>
                      <p className="text-white drop-shadow-lg">
                        You have already accepted a prom invitation and are matched with someone. You cannot send or accept any more invitations.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="w-full bg-[#a91851] text-white font-semibold py-3 rounded-lg hover:bg-[#8e1645] transition-colors"
                    >
                      Okay
                    </button>
                  </>
                ) : inviteModalType === 'pending' ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                        <Heart className="w-8 h-8 text-yellow-500" fill="#eab308" />
                      </div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Invitation Pending</h2>
                      <p className="text-white drop-shadow-lg">
                        You have already sent a prom invitation to <span className="font-semibold">{selectedChat?.name}</span>.
                        <span className="block mt-2 text-sm text-white/80">
                          Please wait for them to accept or decline your invitation.
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="w-full bg-[#a91851] text-white font-semibold py-3 rounded-lg hover:bg-[#8e1645] transition-colors"
                    >
                      Okay
                    </button>
                  </>
                ) : inviteModalType === 'accept' ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                        <Heart className="w-8 h-8 text-green-600" fill="#16a34a" />
                      </div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Accept Prom Invite?</h2>
                      <p className="text-white drop-shadow-lg">
                        <span className="font-semibold">{selectedChat?.name}</span> has invited you to prom!
                        <span className="block mt-2 text-sm text-white/80">
                          Note: You can only accept one invitation. After accepting, you'll be matched with this person.
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDeclineInvitation()}
                        disabled={isProcessingInvite}
                        className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {isProcessingInvite ? 'Processing...' : 'Decline'}
                      </button>
                      <button
                        onClick={() => handleAcceptInvitation()}
                        disabled={isProcessingInvite}
                        className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessingInvite ? 'Processing...' : 'Accept'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                        <Heart className="w-8 h-8 text-[#a91851]" fill="#a91851" />
                      </div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Invite to Prom?</h2>
                      <p className="text-white drop-shadow-lg">
                        Send a prom invitation to <span className="font-semibold">{selectedChat?.name}</span>?
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowInviteModal(false)}
                        disabled={isProcessingInvite}
                        className="flex-1 bg-white/80 text-gray-700 font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendInvitation}
                        disabled={isProcessingInvite}
                        className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessingInvite ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile View Modal */}
        {showProfile && profileData && (
          <div className="fixed inset-0 z-50 overflow-y-auto chats-background"
            style={{
              backgroundImage: `url(${homebcg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#ffe8cc'
            }}
          >
            {/* Profile header */}
            <div className="sticky top-0 px-4 pt-3 pb-2 flex-shrink-0 bg-white/30 backdrop-blur-xl border-b border-white/30 z-10">
              <div className="max-w-2xl mx-auto flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                  {profileData.name}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleInviteClick}
                    disabled={buttonState.disabled}
                    className={`px-4 py-2 rounded-lg font-semibold text-white transition-all ${buttonState.type === 'accept'
                      ? 'bg-green-600 hover:bg-green-700'
                      : buttonState.type === 'pending'
                        ? 'bg-yellow-500 cursor-not-allowed'
                        : buttonState.type === 'locked'
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                  >
                    {buttonState.type === 'accept' ? 'Accept' : buttonState.type === 'pending' ? 'Pending' : buttonState.type === 'locked' ? 'Locked' : 'Invite'}
                  </button>
                  <button
                    onClick={closeProfile}
                    className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md transition-all hover:bg-white/90 active:scale-95"
                  >
                    <ArrowLeft className="w-5 h-5 text-[#a91851]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Profile content */}
            <div className="px-4 py-6">
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                className="max-w-2xl mx-auto space-y-4 pb-8"
              >
                <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                  <div className="relative">
                    <img
                      src={profileData.images[0]}
                      alt={profileData.name}
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
                        {profileData.name}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 space-y-4 border-2 border-white/30">
                  <div>
                    <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#a91851]" />
                      <p className="text-base text-white break-all drop-shadow-lg">{profileData.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Gender</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#a91851]" />
                      <p className="text-base text-white drop-shadow-lg">{profileData.gender}</p>
                    </div>
                  </div>
                  {profileData.rollNo && (
                    <div>
                      <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Roll Number</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#a91851]" />
                        <p className="text-base text-white drop-shadow-lg">{profileData.rollNo}</p>
                      </div>
                    </div>
                  )}
                </div>

                {profileData.images[1] && (
                  <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                    <img
                      src={profileData.images[1]}
                      alt={`${profileData.name} photo 2`}
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

                {profileData.bio && (
                  <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 border-2 border-white/30">
                    <h3 className="text-sm font-semibold text-white/80 mb-2 drop-shadow">About</h3>
                    <p className="text-base text-white leading-relaxed drop-shadow-lg">
                      {profileData.bio}
                    </p>
                  </div>
                )}

                {profileData.images.slice(2).map((image, index) => (
                  <div key={`profile-img-${index + 2}`} className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                    <img
                      src={image}
                      alt={`${profileData.name} photo ${index + 3}`}
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
          </div>
        )}

        {/* Main Chat Interface */}
        {!showProfile && (
          <div className="w-full lg:max-w-6xl lg:mx-auto">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Matches</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEmailInviteClick}
                    disabled={userProfileData && myisInvited === true}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                  >
                    <Mail className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold text-white drop-shadow">Invite</span>
                  </button>
                  <button
                    onClick={() => setShowNotificationsModal(true)}
                    className="relative p-2 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors border border-white/30"
                  >
                    <Bell className="w-6 h-6 text-white" />
                    {invitationsReceived.length > 0 && myisInvited === false && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {invitationsReceived.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Chat content */}
            <div className="px-4 space-y-4">
              {!selectedChat ? (
                <>
                  {/* Matches list with scrolling */}
                  <div ref={chatsListRef} className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {chats.map((chat) => (
                      <motion.div
                        key={`chat-${chat.SfId}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openChat(chat)}
                        className="bg-white/20 backdrop-blur-md rounded-2xl shadow-md p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:bg-white/30 transition-all border border-white/30"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={chat.profileImage}
                            alt={chat.name}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-white/30"
                            onError={e => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-white drop-shadow-lg truncate">{chat.name}</h3>
                          {chat.bio && <p className="text-sm text-white/80 drop-shadow truncate">{chat.bio}</p>}
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </motion.div>
                    ))}
                    {isLoadingMoreMatches && (
                      <div className="py-4 flex items-center justify-center gap-2 text-white">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium drop-shadow-lg">Loading more matches...</span>
                      </div>
                    )}
                    {(chatsPage >= chatsTotalPages && !isLoadingMoreMatches && chats.length > 0) && (
                      <div className="py-4 text-center text-white/80 text-xs drop-shadow">
                        End of matches
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Chat View */}
                  <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
                    {/* Chat header */}
                    <div className="bg-white/30 backdrop-blur-xl border-b border-white/30 px-4 py-3 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <button onClick={closeChat} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                          <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <img
                          src={selectedChat.profileImage}
                          alt={selectedChat.name}
                          className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                          onClick={handleProfileClick}
                          onError={e => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }}
                        />
                        <div className="flex-1 cursor-pointer" onClick={handleProfileClick}>
                          <h2 className="font-semibold text-white drop-shadow-lg hover:text-white/80 transition-colors">{selectedChat.name}</h2>
                          {isReceiverOnline && <p className="text-xs text-green-300 drop-shadow">Active now</p>}
                        </div>
                        <button
                          onClick={handleInviteClick}
                          disabled={buttonState.disabled}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-white text-sm transition-all ${buttonState.type === 'accept'
                            ? 'bg-green-600 hover:bg-green-700'
                            : buttonState.type === 'pending'
                              ? 'bg-yellow-500 cursor-not-allowed'
                              : buttonState.type === 'locked'
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                          {buttonState.type === 'accept' ? 'Accept' : buttonState.type === 'pending' ? 'Pending' : buttonState.type === 'locked' ? 'Locked' : 'Invite'}
                        </button>
                      </div>
                    </div>

                    {/* Messages Container */}
                    <div
                      ref={messagesContainerRef}
                      className="overflow-y-auto px-4 py-4 space-y-3"
                      style={{
                        height: '50vh',
                        maxHeight: '500px'
                      }}
                    >
                      {isLoadingMoreMessages && (
                        <div className="py-3 flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium text-white drop-shadow-lg">Loading older messages...</span>
                        </div>
                      )}
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-white">
                          <MessageCircle className="w-16 h-16 text-white/50 mb-3 drop-shadow-lg" />
                          <p className="text-sm drop-shadow-lg">No messages yet</p>
                          <p className="text-xs drop-shadow">Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] lg:max-w-[60%] ${msg.sender === 'me' ? 'order-2' : 'order-1'}`}>
                              <div className={`rounded-2xl px-4 py-2 ${msg.sender === 'me'
                                ? 'bg-[#a91851] text-white rounded-br-sm'
                                : 'bg-white/20 backdrop-blur-md text-black rounded-bl-sm shadow-sm border border-white/30'
                                }`}>
                                <p className="text-sm">{msg.text}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`text-xs drop-shadow ${msg.sender === 'me' ? 'text-white/80' : 'text-black/80'
                                  }`}>
                                  {msg.timestamp}
                                </p>
                                {msg.sender === 'me' && msg.delivered && (
                                  <Check className="w-4 h-4 text-white/80" />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input at Bottom */}
                    <div className="bg-white/30 backdrop-blur-xl border-t border-white/30 px-4 py-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          onFocus={handleInputFocus}
                          placeholder="Type a message..."
                          disabled={isSending}
                          className="flex-1 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#a91851]/50 text-gray-900 disabled:opacity-50"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!message.trim() || isSending}
                          className={`p-2 rounded-full transition-colors ${message.trim() && !isSending
                            ? 'bg-[#a91851] text-white hover:bg-[#8e1645]'
                            : 'bg-white/50 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
