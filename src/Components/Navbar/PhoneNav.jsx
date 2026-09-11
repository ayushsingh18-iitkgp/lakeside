import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, MessageCircle, User, Star } from 'lucide-react';

export default function PhoneNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname.slice(1) || 'home';
    setActiveTab(path);
  }, [location]);

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/home' },
    { id: 'likes', icon: Heart, label: 'Likes', path: '/likes' },
    { id: 'chats', icon: MessageCircle, label: 'Chats', path: '/chats' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
    { id: 'stars', icon: Star, label: 'Spotlight ', path: '/stars' }
  ];

  const handleNavigation = (item) => {
    setActiveTab(item.id);
    navigate(item.path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm z-50 rounded-t-3xl">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className="flex flex-col items-center gap-1 transition-all"
              >
                <Icon
                  className={`w-7 h-7 transition-colors ${isActive ? 'text-white/90' : 'text-gray-400/60'
                    }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-xs transition-colors ${isActive ? 'text-white/90' : 'text-gray-400/60'
                    }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
