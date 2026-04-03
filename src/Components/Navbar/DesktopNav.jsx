import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, MessageCircle, User, Star } from 'lucide-react';

export default function DesktopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/home' },
    { id: 'likes', icon: Heart, label: 'Likes', path: '/likes' },
    { id: 'chats', icon: MessageCircle, label: 'Chats', path: '/chats' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
    { id: 'stars', icon: Star, label: 'Spotlight ', path: '/stars' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        /* Import Pacifico font for brand name */
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

        /* Brand name with Pacifico font */
        .brand-name {
          font-family: 'Pacifico', cursive;
          font-weight: 400;
        }
      `}</style>

      <aside className="hidden lg:flex lg:flex-col w-72 bg-gradient-to-b from-[#ffe8cc] via-[#ffcfa3] via-[#ffb088] to-[#ff8c6b] border-r-2 border-[#ff8c6b]/30 h-screen sticky top-0 shadow-xl">
        {/* Logo Section */}
        <div className="p-6 border-b-2 border-[#ff8c6b]/30">
          <div className="flex flex-col items-center gap-2">
            <h1 className="brand-name text-4xl text-[#a91851] text-center">
              Lumière Lore
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                      active
                        ? 'bg-gradient-to-r from-[#a91851] to-[#8e1645] text-white shadow-lg scale-105'
                        : 'text-[#a91851] hover:bg-white/40 hover:scale-102'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${active ? 'text-white' : 'text-[#a91851]'}`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span className={`text-base ${active ? 'font-bold' : 'font-semibold'}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Decoration */}
        <div className="p-6 border-t-2 border-[#ff8c6b]/30">
          <div className="text-center">
            <p className="text-sm text-[#8e1645] font-medium drop-shadow">Find Your Match</p>
          </div>
        </div>
      </aside>
    </>
  );
}
