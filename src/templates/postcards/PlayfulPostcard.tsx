import React from 'react';
import { Heart, Sun, MessageCircle, Music } from 'lucide-react';

interface PlayfulPostcardProps {
  imageUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
  imagePosition: { x: number; y: number; scale: number };
  onDragEnd?: (info: { offset: { x: number; y: number } }) => void;
  brandName?: string;
  tagline?: string;
  contactInfo?: { phone?: string; email?: string; website?: string; address?: string };
  callToAction?: string;
  extraInfo?: string;
  isLoading?: boolean;
}

const PlayfulPostcard: React.FC<PlayfulPostcardProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  brandName = "FunZone Adventures",
  tagline = "Where Every Day is an Adventure!",
  contactInfo = {},
  callToAction = "Book your fun experience today!",
  extraInfo = "Birthday packages available!",
  isLoading = false
}) => {
  const { phone, email } = contactInfo;
  
  // For draggable image functionality
  const imageStyle = {
    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imagePosition.scale})`,
  };
  
  return (
    <div
      className={`relative overflow-hidden rounded-lg cursor-pointer transition-shadow ${
        isSelected ? 'ring-2 ring-electric-teal shadow-lg' : 'ring-1 ring-electric-teal/30'
      }`}
      style={{
        width: '1872px',
        height: '1271px',
        backgroundImage: 'linear-gradient(135deg, #FF9370 0%, #FFCC47 100%)'
      }}
      onClick={onSelect}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-yellow-100"></div>
      
      {/* Polaroid Frame */}
      <div 
        className="absolute bg-white shadow-xl rounded-lg overflow-hidden transform rotate-1"
        style={{ 
          top: '8%',
          left: '5%',
          width: '90%',
          height: '84%'
        }}
      >
        {/* Top image section */}
        <div 
          className="absolute bg-yellow-100 overflow-hidden"
          style={{
            top: 0,
            left: 0,
            width: '100%',
            height: '60%'
          }}
        >
          {imageUrl ? (
            <div className="relative w-full h-full overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Postcard visual" 
                className="absolute w-full h-full object-cover"
                style={imageStyle}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              {isLoading ? (
                <div className="animate-pulse text-gray-400">Loading image...</div>
              ) : (
                <div className="text-gray-400">Select an image</div>
              )}
            </div>
          )}
          
          <div 
            className="absolute bg-white rounded-full shadow-md flex items-center justify-center"
            style={{
              top: '5%',
              left: '5%',
              width: '40px',
              height: '40px'
            }}
          >
            <Heart size={24} className="text-pink-500" />
          </div>
          <div 
            className="absolute"
            style={{
              top: '5%',
              right: '5%',
              fontSize: '36px'
            }}
          >
            🎉
          </div>
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent h-24 opacity-50"></div>
          <div className="absolute bottom-5 left-5 text-white font-bold text-2xl">{brandName}</div>
        </div>
        
        {/* Content section */}
        <div 
          className="absolute"
          style={{
            top: '60%',
            left: 0,
            width: '100%',
            height: '40%',
            padding: '24px'
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-extrabold text-pink-500">
              {tagline}
            </h3>
            <div className="rotate-12 text-3xl">🎪</div>
          </div>
          
          <div className="space-y-3 mb-5">
            <div className="flex items-center">
              <Sun size={20} className="text-yellow-500 mr-3 flex-shrink-0" />
              <span className="text-base">Make your day super fun!</span>
            </div>
            <div className="flex items-center">
              <MessageCircle size={20} className="text-green-500 mr-3 flex-shrink-0" />
              <span className="text-base">Create memorable experiences</span>
            </div>
            <div className="flex items-center">
              <Music size={20} className="text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-base">Bring joy to every moment</span>
            </div>
          </div>
          
          <div 
            className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl shadow-md transform -rotate-1 text-white font-bold text-center"
            style={{
              padding: '12px',
              marginBottom: '20px',
              fontSize: '16px'
            }}
          >
            {callToAction}
          </div>
          
          <div className="flex flex-wrap justify-between text-sm text-gray-600">
            {phone && <div>📱 {phone}</div>}
            {email && <div>💌 {email}</div>}
            {extraInfo && <div className="w-full text-center mt-2 italic">{extraInfo}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayfulPostcard; 