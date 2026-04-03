import React from 'react';
import { Heart, X, Mail, User, Calendar, IdCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomeDesktop({
  currentProfile,
  animation,
  handleSwipe,
  handleUndo,
  history
}) {
  // Prevent context menu (right-click)
  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  // Prevent drag
  const handleDragStart = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <>
      {/* Header with Undo Button - No gradient */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            {currentProfile.name}
          </h1>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md transition-all ${
              history.length === 0
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-white active:scale-95'
            }`}
          >
            <svg
              className="w-5 h-5 text-[#a91851]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 14L4 9m0 0l5-5M4 9h10.5a5.5 5.5 0 015.5 5.5v0a5.5 5.5 0 01-5.5 5.5H13" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content - Centered */}
      <div className="flex-1 overflow-y-auto pb-32">
        <motion.div
          key={currentProfile.id}
          initial={{ scale: 1, opacity: 1 }}
          animate={
            animation === 'like' || animation === 'dislike'
              ? {
                  scale: 0,
                  opacity: 0,
                  transition: {
                    duration: 0.75,
                    ease: 'easeInOut',
                  },
                }
              : {}
          }
          className="max-w-5xl mx-auto px-6 space-y-6"
        >
          {/* Image Gallery Grid - All Images in Layout */}
          <div className="grid grid-cols-3 gap-3">
            {currentProfile.images.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-xl bg-white/20 backdrop-blur-md shadow-xl hover:shadow-2xl transition-shadow border-2 border-white/30"
              >
                <img
                  src={image}
                  alt={`${currentProfile.name} photo ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer select-none"
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  draggable="false"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400?text=No+Image';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Profile Details Card - Below Images */}
          <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
            {/* Email, Roll Number, Gender Section */}
            <div className="px-8 py-5 border-b border-white/20">
              <div className="grid grid-cols-4 gap-6">

                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#a91851]" />
                  <div className="overflow-hidden">
                    <p className="text-xs text-white/80 mb-0.5 drop-shadow">Email</p>
                    <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
                      {currentProfile.email}
                    </p>
                  </div>
                </div>

                {/* Roll Number */}
                <div className="flex items-center gap-3">
                  <IdCard className="w-5 h-5 text-[#a91851]" />
                  <div>
                    <p className="text-xs text-white/80 mb-0.5 drop-shadow">Roll Number</p>
                    <p className="text-sm font-semibold text-white drop-shadow-lg">
                      {currentProfile.rollNo}
                    </p>
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#a91851]" />
                  <div>
                    <p className="text-xs text-white/80 mb-0.5 drop-shadow">Gender</p>
                    <p className="text-sm font-semibold text-white drop-shadow-lg">
                      {currentProfile.gender}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            {currentProfile.bio && (
              <div className="px-8 py-6">
                <h3 className="text-lg font-bold text-white mb-3 drop-shadow-lg">
                  About {currentProfile.name}
                </h3>
                <p className="text-base text-white leading-relaxed drop-shadow-lg">
                  {currentProfile.bio}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Fixed Action Buttons - Positioned to match screenshot */}
      <div className="fixed bottom-[4rem] left-0 right-0 z-20">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          {/* Dislike Button - left side */}
          <button
            onClick={() => handleSwipe(false)}
            className="p-6 rounded-full bg-white/90 backdrop-blur-sm shadow-2xl hover:bg-white hover:shadow-3xl transition-all active:scale-95 hover:scale-110"
            disabled={animation !== ''}
          >
            <X className="w-9 h-9 text-red-500" strokeWidth={2.5} />
          </button>

          {/* Like Button - right side with offset */}
          <div style={{ marginRight: '3rem' }}>
            <button
              onClick={() => handleSwipe(true)}
              className="p-6 rounded-full bg-gradient-to-r from-[#a91851] to-[#8e1645] shadow-2xl hover:shadow-3xl transition-all active:scale-95 hover:scale-110"
              disabled={animation !== ''}
            >
              <Heart className="w-9 h-9 text-white" strokeWidth={2.5} fill="white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
