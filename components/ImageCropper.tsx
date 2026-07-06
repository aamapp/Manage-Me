import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, Crop, RefreshCcw } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel
}) => {
  const [scale, setScale] = useState<number>(1.0); // 1.0 to 3.0
  const [rotate, setRotate] = useState<number>(0); // 0, 90, 180, 270
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [imgDims, setImgDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [croppedImageReady, setCroppedImageReady] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, posX: 0, posY: 0 });
  const imageElementRef = useRef<HTMLImageElement>(null);
  const touchRef = useRef({ isPinching: false, initialDistance: 0, initialScale: 1.0 });

  // Load the image dimensions to calculate proper fit and centering
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Scale down image dimensions to fit the container bounds initially
      const cropBoxSize = 300;
      let w = img.width;
      let h = img.height;
      
      const ratio = w / h;
      if (ratio > 1) {
        // Landscape
        h = cropBoxSize;
        w = cropBoxSize * ratio;
      } else {
        // Portrait or Square
        w = cropBoxSize;
        h = cropBoxSize / ratio;
      }
      
      setImgDims({ w, h });
      setCroppedImageReady(true);
    };
  }, [imageSrc]);

  // Handle Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const nextScale = scale - e.deltaY * 0.0015;
    const boundedScale = Math.min(Math.max(nextScale, 1.0), 3.0);
    setScale(parseFloat(boundedScale.toFixed(2)));
  };

  // Handle Touch pinch zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchRef.current = {
        isPinching: true,
        initialDistance: dist,
        initialScale: scale
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchRef.current.isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (touchRef.current.initialDistance > 0) {
        const factor = dist / touchRef.current.initialDistance;
        const nextScale = Math.min(Math.max(touchRef.current.initialScale * factor, 1.0), 3.0);
        setScale(parseFloat(nextScale.toFixed(2)));
      }
    }
  };

  const handleTouchEnd = () => {
    touchRef.current.isPinching = false;
  };

  // Handle Drag Pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchRef.current.isPinching) return;
    e.preventDefault();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  // Bound adjustment to prevent black borders
  useEffect(() => {
    if (imgDims.w === 0 || imgDims.h === 0) return;

    const isRotated = rotate % 180 !== 0;
    const W = (isRotated ? imgDims.h : imgDims.w) * scale;
    const H = (isRotated ? imgDims.w : imgDims.h) * scale;

    const limitX = Math.max(0, (W - 300) / 2);
    const limitY = Math.max(0, (H - 300) / 2);

    setPosition((prev) => ({
      x: Math.min(Math.max(prev.x, -limitX), limitX),
      y: Math.min(Math.max(prev.y, -limitY), limitY),
    }));
  }, [scale, rotate, imgDims]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchRef.current.isPinching || !dragRef.current.isDragging) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    const targetX = dragRef.current.posX + dx;
    const targetY = dragRef.current.posY + dy;
    
    const isRotated = rotate % 180 !== 0;
    const W = (isRotated ? imgDims.h : imgDims.w) * scale;
    const H = (isRotated ? imgDims.w : imgDims.h) * scale;
    
    const limitX = Math.max(0, (W - 300) / 2);
    const limitY = Math.max(0, (H - 300) / 2);
    
    setPosition({
      x: Math.min(Math.max(targetX, -limitX), limitX),
      y: Math.min(Math.max(targetY, -limitY), limitY)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  // Convert English scale to Bengali numbers for visual consistency
  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const activeScalePercentage = Math.round(scale * 100);

  // Compute crop offscreen canvas
  const handleConfirmCrop = () => {
    if (!imageElementRef.current) return;
    
    const cropBoxSize = 300;
    const canvas = document.createElement('canvas');
    // Save output avatar at 400x400 (ideal for lightweight, crisp thumbnail)
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with clean background in case of margins
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Setup coordinates relative to output size ratios
    // 1. Move origin to center of output canvas
    ctx.translate(outputSize / 2, outputSize / 2);
    
    // 2. Apply rotate
    ctx.rotate((rotate * Math.PI) / 180);
    
    // 3. Draw image centered
    const ratio = outputSize / cropBoxSize;
    const scaledW = imgDims.w * scale * ratio;
    const scaledH = imgDims.h * scale * ratio;
    
    // Apply position coordinate translated by ratio
    const drawX = position.x * ratio - (scaledW / 2);
    const drawY = position.y * ratio - (scaledH / 2);
    
    // Load fresh image to avoid CORS canvas pollution or scaled artifacts
    const sourceImg = new Image();
    sourceImg.src = imageSrc;
    sourceImg.onload = () => {
      ctx.drawImage(sourceImg, drawX, drawY, scaledW, scaledH);
      
      // Extract high quality compressed result base64 string
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      onCropComplete(croppedBase64);
    };
    sourceImg.onerror = () => {
      // Fallback direct draw
      try {
        ctx.drawImage(imageElementRef.current!, drawX, drawY, scaledW, scaledH);
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        onCropComplete(croppedBase64);
      } catch (err) {
        console.error('Failed drawing to canvas:', err);
      }
    };
  };

  // Generate ticks for the beautiful scale visual control
  const totalTicks = 25;
  const scalePercentMin = 100;
  const scalePercentMax = 300;

  return (
    <div className="fixed inset-0 bg-black z-[1100] flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* 1. Sub-Header: matching user layout exactly */}
      <div className="flex items-center justify-between px-5 py-4 bg-sky-600 shrink-0 select-none z-10 w-full">
        <button 
          type="button" 
          onClick={onCancel}
          className="p-1 text-white hover:opacity-85 active:scale-95 transition-all cursor-pointer"
        >
          <X size={26} strokeWidth={2.5} />
        </button>
        
        <h2 className="text-[20px] font-bold text-white tracking-wide">
          ছবি কাটুন
        </h2>
        
        <button 
          type="button" 
          onClick={handleConfirmCrop}
          className="p-1 text-white hover:opacity-85 active:scale-95 transition-all cursor-pointer"
        >
          <Check size={26} strokeWidth={2.8} />
        </button>
      </div>

      {/* 2. Interactive Image Crop Area containing viewport 3x3 grid */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full min-h-0 bg-neutral-950 p-4">
        {croppedImageReady ? (
          <div 
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-[300px] h-[300px] relative overflow-hidden bg-neutral-900 border border-white/35 rounded-sm shadow-2xl cursor-grab active:cursor-grabbing z-10 touch-none"
          >
            {/* Visual Image Rendered */}
            <img
              ref={imageElementRef}
              src={imageSrc}
              alt="Cropper preview"
              className="absolute max-w-none origin-center pointer-events-none select-none"
              style={{
                width: `${imgDims.w}px`,
                height: `${imgDims.h}px`,
                transform: `translate(${position.x}px, ${position.y}px) rotate(${rotate}deg) scale(${scale})`,
                left: `calc(50% - ${imgDims.w / 2}px)`,
                top: `calc(50% - ${imgDims.h / 2}px)`,
                transition: dragRef.current.isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            />

            {/* Viewport Overlay bounds with 3x3 Grid overlays */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/25">
              <div className="border-r border-b border-white/15"></div>
              <div className="border-r border-b border-white/15"></div>
              <div className="border-b border-white/15"></div>
              <div className="border-r border-b border-white/15"></div>
              <div className="border-r border-b border-white/15"></div>
              <div className="border-b border-white/15"></div>
              <div className="border-r border-white/15"></div>
              <div className="border-r border-white/15"></div>
              <div className="border-none"></div>
            </div>
          </div>
        ) : (
          <div className="text-white text-sm font-medium animate-pulse">
            ছবি লোড হচ্ছে...
          </div>
        )}
      </div>

      {/* 3. Bottom Controls Panel */}
      <div className="bg-[#121418] border-t border-neutral-800/80 px-4 py-6 w-full flex flex-col gap-6 shrink-0 pb-10 z-10 select-none">
        
        {/* Scale percentage info & ticking list */}
        <div className="relative flex flex-col items-center select-none w-full max-w-sm mx-auto">
          {/* Active indicator */}
          <span className="text-[14px] text-orange-500 font-black mb-2 select-none font-mono">
            {toBanglaNumbers(activeScalePercentage)}%
          </span>
          
          <div className="relative w-full flex items-center justify-center py-2 h-10">
            {/* Render Ticks */}
            <div className="absolute inset-x-0 bottom-0 h-8 flex justify-between items-end pointer-events-none px-2">
              {Array.from({ length: totalTicks }).map((_, i) => {
                const tickValue = scalePercentMin + (i * ((scalePercentMax - scalePercentMin) / (totalTicks - 1)));
                const isActive = Math.abs(activeScalePercentage - tickValue) < 8;
                const isCenter = i === Math.floor(totalTicks / 2);
                
                return (
                  <div 
                    key={i} 
                    className={`w-[2.2px] rounded-full transition-all duration-200 ${
                      isActive 
                        ? 'h-6 bg-orange-500' 
                        : isCenter 
                          ? 'h-4 bg-neutral-500' 
                          : 'h-2.5 bg-neutral-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Invisible native range-slider positioned exactly on top */}
            <input
              type="range"
              min={1.0}
              max={3.0}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
          </div>
          
          {/* Slider indicator pointer */}
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
        </div>

        {/* Action Tabs Menu */}
        <div className="flex justify-around items-center w-full max-w-xs mx-auto border-t border-neutral-800/30 pt-4.5">
          {/* Rotate Trigger Button */}
          <button
            type="button"
            onClick={handleRotate}
            className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white group active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-neutral-700 text-neutral-300">
              <RotateCw size={19} className="group-hover:text-white" />
            </div>
            <span className="text-[12.5px] font-bold">ঘুরান</span>
          </button>

          {/* Dummy Reset / Scale Mode Display Tab */}
          <button
            type="button"
            onClick={() => {
              setScale(1.0);
              setPosition({ x: 0, y: 0 });
            }}
            className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white group active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-neutral-700 text-neutral-300">
              <RefreshCcw size={18} className="group-hover:text-white" />
            </div>
            <span className="text-[12.5px] font-bold">পূর্বাবস্থা</span>
          </button>
        </div>
        
      </div>
    </div>
  );
};
