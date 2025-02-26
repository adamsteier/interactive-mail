import React from 'react';
// Importing a simpler way to handle icons without lucide-react dependency
// We'll use simple SVG for MapPin and Phone icons

interface ProfessionalPostcardProps {
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

// Simple icon components to avoid dependencies
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
  </svg>
);

const ProfessionalPostcard: React.FC<ProfessionalPostcardProps> = ({
  imageUrl,
  isSelected,
  onSelect,
  imagePosition,
  brandName = "APEX",
  tagline = "Strategic Solutions for Business Growth",
  contactInfo = {},
  callToAction = "Schedule your strategic assessment",
  extraInfo = "",
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
        background: 'linear-gradient(to bottom right, #1e293b, #1e40af)'
      }}
    >
      {/* Left side design element */}
      <div
        className="absolute top-0 left-0 bg-blue-800 opacity-20 transform skew-x-12"
        style={{
          width: '40%', 
          height: '100%'
        }}
      />

      {/* 1. Header bar */}
      <div
        className="absolute bg-white flex items-center justify-between px-5 rounded"
        style={{
          top: '5%',
          left: '5%',
          width: '90%',
          height: '8%'
        }}
      >
        <div className="text-blue-900 font-bold text-2xl tracking-tight">{brandName}</div>
        <div className="bg-blue-600 rounded-full flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
        </div>
      </div>
      
      {/* 2. Main headline */}
      <div
        className="absolute text-white"
        style={{
          top: '17%',
          left: '5%',
          width: '40%'
        }}
      >
        <h3 className="text-2xl font-bold mb-2">{tagline}</h3>
        <p className="text-sm text-blue-100">
          Dedicated to helping businesses achieve their full potential through data-driven strategy.
        </p>
      </div>
      
      {/* 3. Left column benefits */}
      <div
        className="absolute"
        style={{
          top: '35%',
          left: '5%',
          width: '40%'
        }}
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="mt-1 mr-3 h-5 w-5 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
              <div className="h-2.5 w-2.5 bg-white"></div>
            </div>
            <div>
              <span className="text-base font-medium text-white">Streamlined Processes</span>
              <p className="text-sm text-blue-100">Optimize your operations</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="mt-1 mr-3 h-5 w-5 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
              <div className="h-2.5 w-2.5 bg-white"></div>
            </div>
            <div>
              <span className="text-base font-medium text-white">Expert Consultation</span>
              <p className="text-sm text-blue-100">Industry veterans</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 4. Image area */}
      <div
        className="absolute bg-blue-800 bg-opacity-50 rounded overflow-hidden"
        style={{
          top: '17%',
          right: '5%',
          width: '45%',
          height: '25%'
        }}
      >
        {imageUrl ? (
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={imageUrl}
              alt="Business growth"
              className="absolute w-full h-full object-cover mix-blend-overlay"
              style={imageStyle}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="animate-pulse text-blue-200">Loading image...</div>
            ) : (
              <div className="text-blue-200">Select an image</div>
            )}
          </div>
        )}
      </div>
      
      {/* 5. Right column benefits */}
      <div
        className="absolute"
        style={{
          top: '47%',
          right: '5%',
          width: '40%'
        }}
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="mt-1 mr-3 h-5 w-5 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
              <div className="h-2.5 w-2.5 bg-white"></div>
            </div>
            <div>
              <span className="text-base font-medium text-white">Data-Driven Strategy</span>
              <p className="text-sm text-blue-100">Analytics-based decisions</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="mt-1 mr-3 h-5 w-5 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
              <div className="h-2.5 w-2.5 bg-white"></div>
            </div>
            <div>
              <span className="text-base font-medium text-white">Measurable ROI</span>
              <p className="text-sm text-blue-100">Clear success metrics</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 6. CTA Button */}
      <div
        className="absolute bg-blue-600 text-white text-center font-medium py-3 px-4 rounded"
        style={{
          bottom: '15%',
          left: '5%',
          width: '42%'
        }}
      >
        {callToAction}
      </div>
      
      {/* 7. Contact info */}
      <div
        className="absolute flex justify-between items-center"
        style={{
          bottom: '15%',
          right: '5%',
          width: '42%'
        }}
      >
        {address && (
          <div className="flex items-center text-blue-100">
            <div className="mr-2 text-blue-300"><MapPinIcon /></div>
            <span className="text-sm">{address}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center text-blue-100">
            <div className="mr-2 text-blue-300"><PhoneIcon /></div>
            <span className="text-sm">{phone}</span>
          </div>
        )}
      </div>
      
      {/* Optional extra info */}
      {extraInfo && (
        <div className="absolute text-xs text-blue-200 text-center"
          style={{
            bottom: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%'
          }}
        >
          {extraInfo}
        </div>
      )}
    </div>
  );
};

export default ProfessionalPostcard; 