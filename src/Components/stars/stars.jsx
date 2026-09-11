import React from 'react';
import { Star, ExternalLink } from 'lucide-react';

export default function Stars() {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .animate-shimmer {
          background: linear-gradient(
            90deg,
            #a91851 0%,
            #ff69b4 50%,
            #a91851 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>
      
      <div className="h-screen w-full bg-gradient-to-br from-[#ffe8cc] via-[#ffcfa3] to-[#ffb088] flex items-center justify-center p-6">
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center gap-2 mb-4 animate-fade-in-up">
            <Star className="w-8 h-8 text-[#a91851] fill-[#a91851] animate-pulse-slow" />
            <h1 className="text-4xl lg:text-5xl font-bold animate-shimmer">
              Lucky Winners
            </h1>
            <Star className="w-8 h-8 text-[#a91851] fill-[#a91851] animate-pulse-slow" />
          </div>

          <p className="text-xl text-[#8e1645] font-medium max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Want to know who matched with you? View all <span className="font-bold">"Stash and Show"</span> lucky matches on our Spring Fest App!
          </p>

          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <a
              href="https://play.google.com/store/apps/details?id=com.imaginedtime.sf25app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#a91851] to-[#8e1645] text-white text-lg font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <span>View Winners on App</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
