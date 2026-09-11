import React from 'react';
import { Heart, X, Mail, User, Calendar, IdCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomeMobile({ 
  currentProfile, 
  animation, 
  handleSwipe, 
  handleUndo, 
  history 
}) {
  // Prevent context menu (right-click/long-press)
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
      {/* Header with Undo Button - NO GRADIENT */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
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

      {/* Scrollable Profile Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <motion.div
          key={currentProfile.id}
          initial={{ scale: 1, opacity: 1 }}
          animate={animation === 'like' || animation === 'dislike' ? {
            scale: 0,
            opacity: 0,
            transition: {
              duration: 0.75,
              ease: "easeInOut"
            }
          } : {}}
          className="max-w-2xl mx-auto px-4 space-y-4"
        >
          {/* First Image - Profile Header */}
          <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
            <div className="relative">
              <img
                src={currentProfile.images[0]}
                alt={currentProfile.name}
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
                  {currentProfile.name}
                </h2>
              </div>
            </div>
          </div>

          {/* Details Section - Email, Roll Number, Gender */}
          <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 space-y-4 border-2 border-white/30">

            {/* Email */}
            <div>
              <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#a91851]" />
                <p className="text-base text-white break-all drop-shadow-lg">{currentProfile.email}</p>
              </div>
            </div>

            {/* Roll Number */}
            <div>
              <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Roll Number</p>
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-[#a91851]" />
                <p className="text-base text-white drop-shadow-lg">{currentProfile.rollNo}</p>
              </div>
            </div>

            {/* Gender */}
            <div>
              <p className="text-xs font-semibold text-white/80 mb-1 drop-shadow">Gender</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#a91851]" />
                <p className="text-base text-white drop-shadow-lg">{currentProfile.gender}</p>
              </div>
            </div>
          </div>

          {/* Second Image (if available) */}
          {currentProfile.images[1] && (
            <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
              <img
                src={currentProfile.images[1]}
                alt={`${currentProfile.name} photo 2`}
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

          {/* Bio Section */}
          {currentProfile.bio && (
            <div className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 border-2 border-white/30">
              <h3 className="text-sm font-semibold text-white/80 mb-2 drop-shadow">About</h3>
              <p className="text-base text-white leading-relaxed drop-shadow-lg">
                {currentProfile.bio}
              </p>
            </div>
          )}

          {/* Third Image and Remaining Images */}
          {currentProfile.images.slice(2).map((image, index) => (
            <div key={index + 2} className="bg-white/20 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border-2 border-white/30">
              <img
                src={image}
                alt={`${currentProfile.name} photo ${index + 3}`}
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

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-24 md:bottom-24 left-0 right-0 z-20">
        <div className="max-w-2xl mx-auto flex justify-between items-center px-6">
          {/* Dislike Button */}
          <button
            onClick={() => handleSwipe(false)}
            className="p-4 md:p-5 rounded-full bg-white/90 backdrop-blur-sm shadow-xl hover:bg-white transition-all active:scale-95 hover:scale-110"
            disabled={animation !== ''}
          >
            <X className="w-6 h-6 md:w-8 md:h-8 text-red-500" strokeWidth={2.5} />
          </button>

          {/* Like Button */}
          <button
            onClick={() => handleSwipe(true)}
            className="p-4 md:p-5 rounded-full bg-gradient-to-r from-[#a91851] to-[#8e1645] shadow-xl hover:shadow-2xl transition-all active:scale-95 hover:scale-110"
            disabled={animation !== ''}
          >
            <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" strokeWidth={2.5} fill="white" />
          </button>
        </div>
      </div>
    </>
  );
}
