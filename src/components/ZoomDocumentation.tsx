'use client';

import React from 'react';
import ZoomablePostcard from './ZoomablePostcard';

const ZoomDocumentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-electric-teal mb-2">
        Postcard Zoom Functionality
      </h2>
      <p className="text-electric-teal/70 mb-6">
        Our postcard designs now use the actual print dimensions (1872 x 1271 pixels) with a CSS transform zoom feature.
      </p>
      
      <h3 className="text-lg font-semibold text-electric-teal mb-2">Key Features:</h3>
      <ul className="list-disc list-inside text-electric-teal/80 mb-6 space-y-1">
        <li>Maintain high resolution for printing (1872 x 1271 pixels)</li>
        <li>Interactive zoom control between 20% and 200%</li>
        <li>GPU-accelerated scaling for smooth performance</li>
        <li>Consistent design across different view sizes</li>
        <li>Automatic scrollbars when needed</li>
      </ul>
      
      <h3 className="text-lg font-semibold text-electric-teal mb-2">How It Works:</h3>
      <p className="text-electric-teal/70 mb-6">
        We use CSS transforms to scale the postcard while maintaining its original dimensions in the DOM.
        This approach preserves all proportions and ensures high quality at print time.
      </p>
      
      <div className="border border-electric-teal/30 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-electric-teal mb-2">Demo:</h3>
        <ZoomablePostcard>
          <div 
            style={{ 
              width: '1872px', 
              height: '1271px', 
              backgroundColor: '#00c2a8',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h1 style={{ fontSize: '72px', color: 'white', fontWeight: 'bold', marginBottom: '20px' }}>
                PARKLAND COURIER
              </h1>
              <p style={{ fontSize: '32px', color: 'white', maxWidth: '800px' }}>
                This postcard is displayed at exactly 1872 x 1271 pixels - our print dimensions.
                Try using the zoom controls to see how it works!
              </p>
            </div>
            
            <div style={{ fontSize: '24px', color: 'white', textAlign: 'right' }}>
              <p>www.parklandcourier.com</p>
              <p>contact@parklandcourier.com</p>
              <p>(555) 123-4567</p>
            </div>
          </div>
        </ZoomablePostcard>
      </div>
      
      <h3 className="text-lg font-semibold text-electric-teal mb-2">Implementation Benefits:</h3>
      <ul className="list-disc list-inside text-electric-teal/80 mb-6 space-y-1">
        <li>No need to manually scale every element</li>
        <li>Text remains crisp at different zoom levels</li>
        <li>Better performance than scaling individual elements</li>
        <li>Simple, intuitive user interface</li>
        <li>Consistent with modern design tools</li>
      </ul>
    </div>
  );
};

export default ZoomDocumentation; 