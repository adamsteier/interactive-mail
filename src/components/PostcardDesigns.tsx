'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Types for image positioning
interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

// Types for the postcard design props
interface PostcardDesignProps {
  imageUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
  imagePosition: ImagePosition;
  onDragEnd?: (info: { offset: { x: number; y: number } }) => void;
  isLoading?: boolean;
  brandName?: string;
  tagline?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  callToAction?: string;
  extraInfo?: string;
}

// Shared loading animation component
const LoadingAnimation = () => (
  <motion.div
    className="absolute inset-0 bg-gradient-to-r from-pink-400 via-electric-teal to-pink-500"
    animate={{
      x: ['0%', '100%', '0%'],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// Design 1: Professional with Diagonal Accent
export const ProfessionalDesign: React.FC<PostcardDesignProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  onDragEnd,
  isLoading = false,
  brandName,
  tagline,
  contactInfo,
  callToAction,
  extraInfo
}) => {
  return (
    <div 
      className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-white`}
      onClick={onSelect}
    >
      {/* Diagonal accent stripe */}
      <div className="absolute -right-20 -top-8 w-64 h-16 bg-[#00c2a8] transform rotate-45 z-10"></div>
      
      {/* Header with logo area */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gray-100 border-b border-gray-200 flex items-center px-4 z-20">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#00858a] flex items-center justify-center text-white font-bold">
            {brandName ? brandName.substring(0, 2).toUpperCase() : ''}
          </div>
          <div className="ml-2">
            {brandName && <h2 className="font-extrabold text-[#00858a] text-lg leading-tight">{brandName}</h2>}
            {tagline && <p className="text-xs text-gray-600">{tagline}</p>}
          </div>
        </div>
      </div>
      
      {/* Main image area */}
      <div className="absolute left-0 right-0 top-16 bottom-24 bg-gray-200 overflow-hidden">
        {isLoading ? (
          <LoadingAnimation />
        ) : imageUrl ? (
          <motion.div
            className="absolute inset-0"
            drag={isSelected}
            dragMomentum={false}
            onDragEnd={(_, info) => onDragEnd && onDragEnd(info)}
            style={{
              x: imagePosition.x,
              y: imagePosition.y,
              scale: imagePosition.scale,
            }}
          >
            <img 
              src={imageUrl} 
              alt="Postcard Image" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
            <p>Select an image</p>
          </div>
        )}
        
        {/* Call to action banner */}
        {callToAction && (
          <div className="absolute top-4 right-0 bg-[#00c2a8] text-white px-4 py-2 rounded-l-lg font-bold shadow-md">
            {callToAction}
          </div>
        )}
      </div>
      
      {/* Footer with contact details */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gray-100 px-4 py-2 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-1">
          {contactInfo && (
            <div className="text-xs">
              <p className="font-bold text-[#00858a]">Contact Us:</p>
              {contactInfo.phone && <p>📞 {contactInfo.phone}</p>}
              {contactInfo.address && <p>📍 {contactInfo.address}</p>}
            </div>
          )}
          <div className="text-xs">
            <p className="font-bold text-[#00858a]">Follow Us:</p>
            {contactInfo?.email && <p>✉️ {contactInfo.email}</p>}
            {contactInfo?.website && <p>🌐 {contactInfo.website}</p>}
            {extraInfo && <p>📱 Instagram {extraInfo}</p>}
          </div>
        </div>
      </div>
      
      {/* Law firm specific badge */}
      <div className="absolute top-20 left-4 bg-white/90 rounded-lg p-2 shadow-md z-20">
        <p className="text-[#00c2a8] font-bold text-xs">TRUSTED BY LAW FIRMS</p>
        <p className="text-xs text-gray-700">For time-critical deliveries</p>
      </div>
    </div>
  );
};

// Design 2: Bold Modern with Side Panel
export const ModernDesign: React.FC<PostcardDesignProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  onDragEnd,
  isLoading = false,
  brandName,
  tagline,
  contactInfo,
  callToAction,
  extraInfo
}) => {
  return (
    <div 
      className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg aspect-[7/5] overflow-hidden cursor-pointer`}
      onClick={onSelect}
    >
      {/* Side panel */}
      <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-gradient-to-b from-[#00c2a8] to-[#00858a] p-4 flex flex-col justify-between z-20">
        <div>
          {brandName && <h2 className="font-extrabold text-white text-xl leading-tight tracking-tight">{brandName}</h2>}
          <div className="w-12 h-1 bg-white mt-2 mb-3"></div>
          {tagline && <p className="text-white/90 text-sm">{tagline}</p>}
        </div>
        
        {contactInfo && (
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <p className="font-bold text-white text-xs mb-1">CONTACT</p>
            {contactInfo.phone && <p className="text-white text-xs">📞 {contactInfo.phone}</p>}
            {contactInfo.email && <p className="text-white text-xs">✉️ {contactInfo.email}</p>}
            {contactInfo.website && <p className="text-white text-xs">🌐 {contactInfo.website}</p>}
            {contactInfo.address && <p className="text-white text-xs">📍 {contactInfo.address}</p>}
          </div>
        )}
      </div>
      
      {/* Main image area */}
      <div className="absolute left-1/3 top-0 right-0 bottom-0 overflow-hidden">
        {isLoading ? (
          <LoadingAnimation />
        ) : imageUrl ? (
          <motion.div
            className="absolute inset-0"
            drag={isSelected}
            dragMomentum={false}
            onDragEnd={(_, info) => onDragEnd && onDragEnd(info)}
            style={{
              x: imagePosition.x,
              y: imagePosition.y,
              scale: imagePosition.scale,
            }}
          >
            <img 
              src={imageUrl} 
              alt="Postcard Image" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
            <p>Select an image</p>
          </div>
        )}
        
        {/* Multiple overlays/badges */}
        <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg z-30">
          <p className="text-[#00858a] font-extrabold text-sm">SECURE • TIMELY • RELIABLE</p>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 flex justify-between items-center">
          {extraInfo && <p className="text-white font-bold">Instagram {extraInfo}</p>}
          {callToAction && (
            <button className="bg-[#00c2a8] hover:bg-[#00858a] text-white py-2 px-6 rounded-full font-bold transition-colors">
              {callToAction}
            </button>
          )}
        </div>
        
        <div className="absolute bottom-1/3 -right-6 transform rotate-90 bg-[#00c2a8] text-white px-2 py-1 text-xs font-bold">
          FOR LAW FIRMS
        </div>
      </div>
    </div>
  );
};

// Design 3: Elegant with Angled Elements
export const ElegantDesign: React.FC<PostcardDesignProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  onDragEnd,
  isLoading = false,
  brandName,
  tagline,
  contactInfo,
  callToAction,
  extraInfo
}) => {
  return (
    <div 
      className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-white`}
      onClick={onSelect}
    >
      {/* Angled background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#00c2a8]/10 rounded-full"></div>
        <div className="absolute -right-32 -bottom-32 w-96 h-96 bg-[#00858a]/10 rounded-full"></div>
      </div>
      
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#00858a] flex items-center justify-between px-4 z-10">
        {brandName && <p className="text-white font-extrabold tracking-widest">{brandName.toUpperCase()}</p>}
        <p className="text-white text-xs">ESTABLISHED 2007</p>
      </div>
      
      <div className="absolute top-12 bottom-0 left-0 right-0 p-4 flex flex-col">
        {/* Main content grid */}
        <div className="flex h-full">
          {/* Left content */}
          <div className="w-1/2 pr-2 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-[#00858a] text-lg mb-1">Premium Courier Service</h3>
              {tagline && <p className="text-sm text-gray-600 mb-3">{tagline}</p>}
              
              <div className="bg-gray-100 p-3 rounded-lg mb-4">
                <p className="font-bold text-[#00858a] text-xs mb-2">SPECIALIZED SERVICE FOR LAW FIRMS</p>
                <p className="text-xs text-gray-700">Secure document delivery for court filings, contracts, and legal paperwork</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-[#00c2a8]/20 rounded-full flex items-center justify-center text-[#00858a] mr-1">✓</span>
                  <span>Secure</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-[#00c2a8]/20 rounded-full flex items-center justify-center text-[#00858a] mr-1">✓</span>
                  <span>On-time</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-[#00c2a8]/20 rounded-full flex items-center justify-center text-[#00858a] mr-1">✓</span>
                  <span>Tracked</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-[#00c2a8]/20 rounded-full flex items-center justify-center text-[#00858a] mr-1">✓</span>
                  <span>Verified</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              {callToAction && (
                <button className="w-full bg-gradient-to-r from-[#00c2a8] to-[#00858a] hover:from-[#00858a] hover:to-[#00c2a8] text-white py-2 rounded-lg font-bold transition-all transform hover:scale-105">
                  {callToAction.toUpperCase()}
                </button>
              )}
            </div>
          </div>
          
          {/* Right content - image */}
          <div className="w-1/2 pl-2">
            <div className="h-full rounded-lg overflow-hidden border-4 border-white shadow-lg relative">
              {isLoading ? (
                <LoadingAnimation />
              ) : imageUrl ? (
                <motion.div
                  className="absolute inset-0"
                  drag={isSelected}
                  dragMomentum={false}
                  onDragEnd={(_, info) => onDragEnd && onDragEnd(info)}
                  style={{
                    x: imagePosition.x,
                    y: imagePosition.y,
                    scale: imagePosition.scale,
                  }}
                >
                  <img 
                    src={imageUrl} 
                    alt="Postcard Image" 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                  <p>Select an image</p>
                </div>
              )}
              
              {/* Image overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-[#00858a]/80 backdrop-blur-sm p-2">
                <p className="text-white text-center text-xs font-bold">RELIABLE DOCUMENT DELIVERY</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        {(contactInfo || extraInfo) && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-xs text-gray-600">
            {contactInfo && (
              <div className="flex space-x-3">
                {contactInfo.phone && <span>📞 {contactInfo.phone}</span>}
                {contactInfo.email && <span>✉️ {contactInfo.email}</span>}
              </div>
            )}
            <div className="flex space-x-3">
              {contactInfo?.website && <span>🌐 {contactInfo.website}</span>}
              {extraInfo && <span>📱 IG: {extraInfo}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 