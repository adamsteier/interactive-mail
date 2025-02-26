import React from 'react';

interface TraditionalPostcardProps {
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

const TraditionalPostcard: React.FC<TraditionalPostcardProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  brandName = "HERITAGE",
  tagline = "Fine Artisanal Products Since 1892",
  contactInfo = {},
  callToAction = "Request our catalogue",
  extraInfo = "Each product handcrafted with pride",
  isLoading = false
}) => {
  const { phone, address } = contactInfo;
  
  // For draggable image functionality
  const imageStyle = {
    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imagePosition.scale})`,
  };
  
  return (
    <div
      onClick={onSelect}
      className={`relative overflow-hidden rounded-lg aspect-[7/5] cursor-pointer transition-shadow ${
        isSelected ? 'ring-2 ring-electric-teal shadow-lg' : 'ring-1 ring-electric-teal/30'
      }`}
      style={{
        backgroundColor: '#f8f3e9'
      }}
    >
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#7c6c5370_1px,transparent_1px)] bg-[size:20px_20px] opacity-10"></div>
      
      {/* Vintage border */}
      <div 
        className="absolute border-2 border-amber-900 border-dashed"
        style={{
          top: '3%',
          left: '3%',
          right: '3%',
          bottom: '3%'
        }}
      ></div>
      
      {/* Content container */}
      <div 
        className="absolute flex flex-col"
        style={{
          top: '7%',
          left: '7%',
          right: '7%',
          bottom: '7%'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center">
            <div className="h-px w-24 bg-amber-900 self-center"></div>
            <div className="mx-4 text-3xl text-amber-900 font-bold tracking-widest uppercase">{brandName}</div>
            <div className="h-px w-24 bg-amber-900 self-center"></div>
          </div>
          <div className="text-lg text-amber-900 italic">&amp; Craft</div>
          <div className="text-base text-amber-700 mt-2">{tagline}</div>
        </div>
        
        <div className="flex mb-10">
          {/* Left column */}
          <div className="w-1/2 pr-6">
            {/* Image frame */}
            <div className="relative mx-auto w-full">
              <div className="absolute inset-0 border-4 border-amber-900 transform -translate-x-3 -translate-y-3"></div>
              <div className="relative border-4 border-amber-900 overflow-hidden h-72">
                {imageUrl ? (
                  <div className="relative w-full h-full overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="Traditional craftsmanship" 
                      className="absolute w-full h-full object-cover sepia"
                      style={imageStyle}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-100">
                    {isLoading ? (
                      <div className="animate-pulse text-amber-900">Loading image...</div>
                    ) : (
                      <div className="text-amber-900">Select an image</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right column */}
          <div className="w-1/2 pl-6 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl text-amber-900 font-bold mb-3 text-center">Our Commitment to Quality</h3>
              <p className="text-base text-amber-800">
                For over a century, we have dedicated ourselves to the highest standards of craftsmanship and materials, creating heirloom pieces that stand the test of time.
              </p>
            </div>
            
            {/* Benefits */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center">
                <span className="text-amber-900 text-lg mr-3">✦</span>
                <span className="text-base text-amber-900">Time-honored traditional craftsmanship</span>
              </div>
              <div className="flex items-center">
                <span className="text-amber-900 text-lg mr-3">✦</span>
                <span className="text-base text-amber-900">Premium materials sourced responsibly</span>
              </div>
              <div className="flex items-center">
                <span className="text-amber-900 text-lg mr-3">✦</span>
                <span className="text-base text-amber-900">Attention to detail in every piece</span>
              </div>
            </div>
            
            {/* CTA */}
            <div className="bg-amber-900 text-amber-50 py-3 text-center text-base font-semibold tracking-wider uppercase mx-auto px-8 mb-6">
              {callToAction}
            </div>
          </div>
        </div>
        
        {/* Contact */}
        <div className="mt-auto pt-4 border-t border-amber-800">
          <div className="flex justify-between text-base text-amber-900 mb-2">
            {phone && <div>☎️ {phone}</div>}
            {address && <div>⚑ {address}</div>}
          </div>
          {extraInfo && (
            <div className="flex justify-center text-base text-amber-900 italic">
              {extraInfo}
            </div>
          )}
        </div>
        
        {/* Vintage stamp */}
        <div 
          className="absolute border-2 border-amber-800 rounded-sm flex items-center justify-center bg-amber-100 overflow-hidden rotate-6"
          style={{
            top: '3%',
            right: '3%',
            width: '100px',
            height: '100px'
          }}
        >
          <div className="text-amber-800 text-center">
            <div className="text-xs">POSTAGE</div>
            <div className="text-2xl font-bold">1892</div>
            <div className="text-xs">CERTIFIED</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraditionalPostcard; 