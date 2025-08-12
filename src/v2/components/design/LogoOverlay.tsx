'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogoPositionData, validateLogoPosition, pixelsToInches, inchesToPixels } from '../../utils/logoPositionParser';
import LogoUploadModal from './LogoUploadModal';

interface LogoOverlayProps {
  // Logo data
  logoUrl: string;
  logoPosition: LogoPositionData;
  
  // Container dimensions (in pixels)
  containerWidth: number;
  containerHeight: number;
  
  // Control options
  isDraggable?: boolean;
  isResizable?: boolean;
  showControls?: boolean;
  isVisible?: boolean;
  allowLogoUpload?: boolean;
  
  // User/Campaign context for logo upload
  userId?: string;
  campaignId?: string;
  designId?: string;
  
  // Callbacks
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (dimensions: { width: number; height: number }) => void;
  onVisibilityToggle?: (visible: boolean) => void;
  onLogoChange?: (newLogoUrl: string) => void;
  
  // Style options
  className?: string;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startLogoX: number;
  startLogoY: number;
}

interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  handle: 'nw' | 'ne' | 'sw' | 'se' | null;
}

const LogoOverlay = ({
  logoUrl,
  logoPosition,
  containerWidth,
  containerHeight,
  isDraggable = true,
  isResizable = true,
  showControls = true,
  isVisible = true,
  allowLogoUpload = false,
  userId,
  campaignId,
  designId,
  onPositionChange,
  onSizeChange,
  onVisibilityToggle,
  onLogoChange,
  className = ''
}: LogoOverlayProps) => {
  // State for current logo position and size (in pixels)
  const [currentPosition, setCurrentPosition] = useState({
    x: logoPosition.pixels.position.x,
    y: logoPosition.pixels.position.y
  });
  
  const [currentSize, setCurrentSize] = useState({
    width: logoPosition.pixels.dimensions.width,
    height: logoPosition.pixels.dimensions.height
  });
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startLogoX: 0,
    startLogoY: 0
  });
  
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    handle: null
  });
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);
  const logoRef = useRef<HTMLDivElement>(null);
  
  // Calculate scale factor between container and actual postcard dimensions
  const scaleX = containerWidth / inchesToPixels(6); // 6" postcard width
  const scaleY = containerHeight / inchesToPixels(4); // 4" postcard height
  const scale = Math.min(scaleX, scaleY);
  
  // Scaled dimensions for display
  const displayPosition = {
    x: currentPosition.x * scale,
    y: currentPosition.y * scale
  };
  
  const displaySize = {
    width: currentSize.width * scale,
    height: currentSize.height * scale
  };
  
  // Safe zone boundaries (scaled)
  const safeZone = {
    minX: logoPosition.pixels.safeZone.minX * scale,
    minY: logoPosition.pixels.safeZone.minY * scale,
    maxX: logoPosition.pixels.safeZone.maxX * scale,
    maxY: logoPosition.pixels.safeZone.maxY * scale
  };
  
  // Validate current position
  useEffect(() => {
    const positionInInches = {
      x: pixelsToInches(currentPosition.x),
      y: pixelsToInches(currentPosition.y)
    };
    
    const sizeInInches = {
      width: pixelsToInches(currentSize.width),
      height: pixelsToInches(currentSize.height)
    };
    
    const validation = validateLogoPosition(positionInInches, sizeInInches);
    setValidationErrors(validation.errors);
  }, [currentPosition, currentSize]);
  
  // Mouse event handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLogoX: currentPosition.x,
      startLogoY: currentPosition.y
    });
  }, [isDraggable, currentPosition]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.isDragging) {
      const deltaX = (e.clientX - dragState.startX) / scale;
      const deltaY = (e.clientY - dragState.startY) / scale;
      
      let newX = dragState.startLogoX + deltaX;
      let newY = dragState.startLogoY + deltaY;
      
      // Constrain to safe zone
      newX = Math.max(logoPosition.pixels.safeZone.minX, Math.min(newX, logoPosition.pixels.safeZone.maxX - currentSize.width));
      newY = Math.max(logoPosition.pixels.safeZone.minY, Math.min(newY, logoPosition.pixels.safeZone.maxY - currentSize.height));
      
      setCurrentPosition({ x: newX, y: newY });
    }
    
    if (resizeState.isResizing && resizeState.handle) {
      const deltaX = (e.clientX - resizeState.startX) / scale;
      const deltaY = (e.clientY - resizeState.startY) / scale;
      
      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;
      let newX = currentPosition.x;
      let newY = currentPosition.y;
      
      // Handle different resize directions
      switch (resizeState.handle) {
        case 'se': // Bottom-right
          newWidth = Math.max(50, resizeState.startWidth + deltaX);
          newHeight = Math.max(50, resizeState.startHeight + deltaY);
          break;
        case 'sw': // Bottom-left
          newWidth = Math.max(50, resizeState.startWidth - deltaX);
          newHeight = Math.max(50, resizeState.startHeight + deltaY);
          newX = currentPosition.x + (resizeState.startWidth - newWidth);
          break;
        case 'ne': // Top-right
          newWidth = Math.max(50, resizeState.startWidth + deltaX);
          newHeight = Math.max(50, resizeState.startHeight - deltaY);
          newY = currentPosition.y + (resizeState.startHeight - newHeight);
          break;
        case 'nw': // Top-left
          newWidth = Math.max(50, resizeState.startWidth - deltaX);
          newHeight = Math.max(50, resizeState.startHeight - deltaY);
          newX = currentPosition.x + (resizeState.startWidth - newWidth);
          newY = currentPosition.y + (resizeState.startHeight - newHeight);
          break;
      }
      
      // Maintain aspect ratio
      const aspectRatio = logoPosition.dimensions.width / logoPosition.dimensions.height;
      newHeight = newWidth / aspectRatio;
      
      // Constrain to safe zone
      if (newX + newWidth > logoPosition.pixels.safeZone.maxX) {
        newWidth = logoPosition.pixels.safeZone.maxX - newX;
        newHeight = newWidth / aspectRatio;
      }
      
      if (newY + newHeight > logoPosition.pixels.safeZone.maxY) {
        newHeight = logoPosition.pixels.safeZone.maxY - newY;
        newWidth = newHeight * aspectRatio;
      }
      
      setCurrentSize({ width: newWidth, height: newHeight });
      setCurrentPosition({ x: newX, y: newY });
    }
  }, [dragState, resizeState, scale, logoPosition, currentSize, currentPosition]);
  
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState(prev => ({ ...prev, isDragging: false }));
      
      // Notify parent of position change
      if (onPositionChange) {
        const positionInInches = {
          x: pixelsToInches(currentPosition.x),
          y: pixelsToInches(currentPosition.y)
        };
        onPositionChange(positionInInches);
      }
    }
    
    if (resizeState.isResizing) {
      setResizeState(prev => ({ ...prev, isResizing: false, handle: null }));
      
      // Notify parent of size change
      if (onSizeChange) {
        const sizeInInches = {
          width: pixelsToInches(currentSize.width),
          height: pixelsToInches(currentSize.height)
        };
        onSizeChange(sizeInInches);
      }
    }
  }, [dragState.isDragging, resizeState.isResizing, currentPosition, currentSize, onPositionChange, onSizeChange]);
  
  // Resize handle mouse down
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se') => {
    if (!isResizable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setResizeState({
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentSize.width,
      startHeight: currentSize.height,
      handle
    });
  }, [isResizable, currentSize]);
  
  // Keyboard controls for pixel-perfect positioning
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isKeyboardFocused || !isDraggable) return;
    
    // Prevent default browser behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    
    const moveDistance = e.shiftKey ? 10 : 1; // Hold Shift for 10px moves
    let deltaX = 0;
    let deltaY = 0;
    
    switch (e.key) {
      case 'ArrowLeft':
        deltaX = -moveDistance;
        break;
      case 'ArrowRight':
        deltaX = moveDistance;
        break;
      case 'ArrowUp':
        deltaY = -moveDistance;
        break;
      case 'ArrowDown':
        deltaY = moveDistance;
        break;
      case 'Escape':
        setIsKeyboardFocused(false);
        logoRef.current?.blur();
        return;
      default:
        return;
    }
    
    // Apply movement with safe zone constraints
    let newX = currentPosition.x + deltaX;
    let newY = currentPosition.y + deltaY;
    
    // Constrain to safe zone
    newX = Math.max(logoPosition.pixels.safeZone.minX, Math.min(newX, logoPosition.pixels.safeZone.maxX - currentSize.width));
    newY = Math.max(logoPosition.pixels.safeZone.minY, Math.min(newY, logoPosition.pixels.safeZone.maxY - currentSize.height));
    
    setCurrentPosition({ x: newX, y: newY });
    
    // Notify parent of position change
    if (onPositionChange) {
      const positionInInches = {
        x: pixelsToInches(newX),
        y: pixelsToInches(newY)
      };
      onPositionChange(positionInInches);
    }
  }, [isKeyboardFocused, isDraggable, currentPosition, currentSize, logoPosition, onPositionChange]);
  
  // Handle logo click for keyboard focus
  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDraggable) return;
    
    // Focus the logo for keyboard control
    setIsKeyboardFocused(true);
    logoRef.current?.focus();
  }, [isDraggable]);
  
  // Handle logo upload
  const handleLogoUploaded = useCallback((newLogoUrl: string) => {
    setCurrentLogoUrl(newLogoUrl);
    onLogoChange?.(newLogoUrl);
    setShowUploadModal(false);
  }, [onLogoChange]);
  
  // Global mouse event listeners
  useEffect(() => {
    if (dragState.isDragging || resizeState.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, resizeState.isResizing, handleMouseMove, handleMouseUp]);
  
  // Keyboard event listeners
  useEffect(() => {
    if (isKeyboardFocused) {
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isKeyboardFocused, handleKeyDown]);
  
  if (!isVisible) return null;
  
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Safe zone visualization (optional) */}
      {showControls && (
        <div
          className="absolute border border-blue-400/30 bg-blue-400/5"
          style={{
            left: safeZone.minX,
            top: safeZone.minY,
            width: safeZone.maxX - safeZone.minX,
            height: safeZone.maxY - safeZone.minY
          }}
        />
      )}
      
      {/* Logo */}
      <motion.div
        ref={logoRef}
        className={`absolute pointer-events-auto ${isDraggable ? 'cursor-move' : ''} ${
          dragState.isDragging ? 'z-50' : 'z-10'
        } ${isKeyboardFocused ? 'outline-none' : ''}`}
        style={{
          left: displayPosition.x,
          top: displayPosition.y,
          width: displaySize.width,
          height: displaySize.height
        }}
        onMouseDown={handleMouseDown}
        onClick={handleLogoClick}
        tabIndex={isDraggable ? 0 : -1}
        onFocus={() => setIsKeyboardFocused(true)}
        onBlur={() => setIsKeyboardFocused(false)}
        animate={{
          scale: dragState.isDragging ? 1.05 : 1
        }}
        transition={{ duration: 0.1 }}
      >
        <img
          src={currentLogoUrl}
          alt="Logo"
          className="w-full h-full object-contain"
          draggable={false}
        />
        
        {/* Resize handles */}
        {isResizable && showControls && (
          <>
            {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
              <div
                key={handle}
                className={`absolute w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-${
                  handle === 'nw' || handle === 'se' ? 'nw' : 'ne'
                }-resize hover:bg-blue-600 transition-colors`}
                style={{
                  [handle.includes('n') ? 'top' : 'bottom']: -6,
                  [handle.includes('w') ? 'left' : 'right']: -6
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, handle)}
              />
            ))}
          </>
        )}
        
        {/* Logo border when selected or focused */}
        {showControls && (
          <div className={`absolute inset-0 border-2 rounded pointer-events-none transition-colors ${
            isKeyboardFocused 
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
              : 'border-blue-500'
          }`} />
        )}
        
        {/* Keyboard focus indicator */}
        {isKeyboardFocused && (
          <div className="absolute -top-8 left-0 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-medium pointer-events-none">
            Use arrow keys to move (Shift+Arrow for 10px)
          </div>
        )}
      </motion.div>
      
      {/* Controls panel */}
      {showControls && (
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg p-2 space-y-2 pointer-events-auto">
          <button
            onClick={() => onVisibilityToggle?.(false)}
            className="w-full px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            Hide Logo
          </button>
          
          <button
            onClick={() => {
              setIsKeyboardFocused(true);
              logoRef.current?.focus();
            }}
            className={`w-full px-3 py-1 text-xs rounded transition-colors ${
              isKeyboardFocused
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            {isKeyboardFocused ? 'Keyboard Active' : 'Enable Keyboard'}
          </button>
          
          {allowLogoUpload && userId && campaignId && designId && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              Upload Different Logo
            </button>
          )}
          
          {validationErrors.length > 0 && (
            <div className="text-xs text-red-400 max-w-48">
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
          
          {/* Keyboard shortcuts help */}
          <div className="text-xs text-gray-300 max-w-48 pt-1 border-t border-gray-600">
            <div className="font-medium mb-1">Keyboard Controls:</div>
            <div>• Arrow keys: Move 1px</div>
            <div>• Shift+Arrow: Move 10px</div>
            <div>• Escape: Exit keyboard mode</div>
          </div>
        </div>
      )}
      
      {/* Logo Upload Modal */}
      {allowLogoUpload && userId && campaignId && designId && (
        <LogoUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onLogoUploaded={handleLogoUploaded}
          currentLogoUrl={currentLogoUrl}
          userId={userId}
          campaignId={campaignId}
          designId={designId}
        />
      )}
    </div>
  );
};

export default LogoOverlay;
