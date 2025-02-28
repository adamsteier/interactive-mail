import React from 'react';

interface ModernPostcardProps {
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

const ModernPostcard: React.FC<ModernPostcardProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  brandName = "FLUX",
  tagline = "Minimal designs. Maximum impact.",
  contactInfo = {},
  callToAction = "Start your project",
  extraInfo = "",
  isLoading = false
}) => {
  const { email, phone, website } = contactInfo;
  
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
        backgroundColor: '#ffffff'
      }}
      onClick={onSelect}
    >
      <div className="absolute inset-0 flex h-full">
        {/* Left side - Black */}
        <div className="w-1/2 h-full bg-black relative">
          {imageUrl ? (
            <div className="relative w-full h-full overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Design visual" 
                className="absolute w-full h-full object-cover mix-blend-luminosity opacity-70"
                style={imageStyle}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-70">
              {isLoading ? (
                <div className="animate-pulse text-gray-400">Loading image...</div>
              ) : (
                <div className="text-gray-400">Select an image</div>
              )}
            </div>
          )}
          
          <div 
            className="absolute flex flex-col justify-center"
            style={{
              top: '10%',
              left: '10%',
              width: '80%',
              height: '80%'
            }}
          >
            <div className="text-sm tracking-widest uppercase mb-4 text-gray-400">Design Studio</div>
            <div className="text-6xl font-extrabold tracking-tight text-white mb-4">{brandName}</div>
            <div className="h-1.5 w-16 bg-red-500 my-6"></div>
            <div className="text-xl font-light tracking-wide text-white">
              {tagline}
            </div>
          </div>
        </div>
        
        {/* Right side - White */}
        <div className="w-1/2 h-full bg-white relative">
          {/* Corner accent */}
          <div className="absolute top-0 right-0 border-t-[60px] border-r-[60px] border-t-black border-r-transparent"></div>
          
          {/* Content */}
          <div
            className="absolute flex flex-col"
            style={{
              top: '10%',
              left: '10%',
              width: '80%',
              height: '80%'
            }}
          >
            <div className="mt-10 space-y-6 mb-8">
              <div className="flex items-start">
                <div className="mt-2 mr-4 h-2 w-2 bg-black rounded-full"></div>
                <div>
                  <h4 className="text-xl font-medium text-black mb-1">Clean Interfaces</h4>
                  <p className="text-base text-gray-600">
                    We create digital products with intuitive navigation and purposeful design.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-2 mr-4 h-2 w-2 bg-black rounded-full"></div>
                <div>
                  <h4 className="text-xl font-medium text-black mb-1">Digital Solutions</h4>
                  <p className="text-base text-gray-600">
                    Data-driven approach to solving complex design challenges.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-2 mr-4 h-2 w-2 bg-black rounded-full"></div>
                <div>
                  <h4 className="text-xl font-medium text-black mb-1">Minimal Impact</h4>
                  <p className="text-base text-gray-600">
                    Less visual noise, more meaningful interaction and engagement.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-2 border-black text-black text-center py-3 px-6 text-lg tracking-widest uppercase font-medium hover:bg-black hover:text-white transition-colors duration-300 w-60 mx-auto mb-8">
              {callToAction}
            </div>
            
            <div className="mt-auto text-base text-gray-500 space-y-2">
              {email && (
                <div className="flex items-center">
                  <span className="w-6 font-medium">@</span> {email}
                </div>
              )}
              {phone && (
                <div className="flex items-center">
                  <span className="w-6 font-medium">#</span> {phone}
                </div>
              )}
              {website && (
                <div className="flex items-center">
                  <span className="w-6 font-medium">↗</span> {website}
                </div>
              )}
              {extraInfo && (
                <div className="text-xs italic mt-2">{extraInfo}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPostcard; 