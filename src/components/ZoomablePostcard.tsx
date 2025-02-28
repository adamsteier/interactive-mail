'use client';

import React, { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ZoomablePostcardProps {
  children: ReactNode;
  showControls?: boolean;
}

const ZoomablePostcard: React.FC<ZoomablePostcardProps> = ({ 
  children,
  showControls = true
}) => {
  // Set default zoom to 0.5 (50%)
  const [zoomLevel, setZoomLevel] = useState(0.5);
  
  // Zoom in function - increase by 0.1 up to maximum of 2.0 (200%)
  const zoomIn = () => {
    setZoomLevel(prevZoom => Math.min(2.0, prevZoom + 0.1));
  };

  // Zoom out function - decrease by 0.1 down to minimum of 0.2 (20%)
  const zoomOut = () => {
    setZoomLevel(prevZoom => Math.max(0.2, prevZoom - 0.1));
  };

  // Reset to specific zoom levels
  const resetZoom = (level: number) => {
    setZoomLevel(level);
  };
  
  // Container for overflow handling and scrollbars
  const containerStyle = {
    maxWidth: "100%",
    maxHeight: "80vh", // Limit height to 80% of viewport height
    overflow: "auto",
    border: "1px solid #ddd",
    borderRadius: "8px",
    margin: "0 auto"
  };

  // The actual postcard with transform scaling
  const postcardStyle = {
    width: "1872px",
    height: "1271px",
    transform: `scale(${zoomLevel})`,
    transformOrigin: "0 0", // Scale from top-left corner
  };
  
  return (
    <div>
      {/* Zoom controls */}
      {showControls && (
        <div className="zoom-controls flex items-center space-x-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={zoomOut}
            className="px-3 py-1 bg-electric-teal text-charcoal rounded"
          >
            −
          </motion.button>
          <span className="text-electric-teal/80">
            {Math.round(zoomLevel * 100)}%
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={zoomIn}
            className="px-3 py-1 bg-electric-teal text-charcoal rounded"
          >
            +
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => resetZoom(0.5)}
            className="px-3 py-1 ml-2 bg-electric-teal/80 text-charcoal rounded"
          >
            50%
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => resetZoom(1.0)}
            className="px-3 py-1 bg-electric-teal/80 text-charcoal rounded"
          >
            100%
          </motion.button>
        </div>
      )}
      
      {/* Scrollable container */}
      <div style={containerStyle}>
        {/* Actual postcard with transform */}
        <div style={postcardStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ZoomablePostcard; 