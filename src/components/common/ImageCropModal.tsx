import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Crop as CropIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cropImage } from '../../utils/image';

export interface CropDetails {
  x: number;
  y: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onComplete: (croppedDataUrl: string, cropDetails?: CropDetails) => void;
  aspectRatio?: number;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({ isOpen, onClose, imageSrc, onComplete, aspectRatio }) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  if (!isOpen) return null;

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const rect = imgRef.current?.getBoundingClientRect();
      const renderedWidth = rect?.width || 1;
      const renderedHeight = rect?.height || 1;
      
      const cropToUse = (!completedCrop || !completedCrop.width || !completedCrop.height)
        ? { x: 0, y: 0, width: renderedWidth, height: renderedHeight }
        : completedCrop;

      const croppedUrl = await cropImage(imageSrc, cropToUse, renderedWidth, renderedHeight);
      
      const naturalWidth = imgRef.current?.naturalWidth || 1;
      const naturalHeight = imgRef.current?.naturalHeight || 1;
      const scaleX = naturalWidth / renderedWidth;
      const scaleY = naturalHeight / renderedHeight;
      
      const cropDetails = {
        x: cropToUse.x * scaleX,
        y: cropToUse.y * scaleY,
        width: cropToUse.width * scaleX,
        height: cropToUse.height * scaleY,
        originalWidth: naturalWidth,
        originalHeight: naturalHeight
      };

      onComplete(croppedUrl, cropDetails);
      onClose();
    } catch (e) {
      console.error('Failed to crop image', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-accent" />
            Crop Image
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body (Scrollable if image is large, though ReactCrop handles resizing) */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-background/50">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="max-h-[60vh] max-w-full"
          >
            <img 
              ref={imgRef}
              src={imageSrc} 
              alt="Crop" 
              className="max-h-[60vh] object-contain rounded-md"
              crossOrigin="anonymous" 
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-surface/50">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing} className="bg-accent text-white hover:bg-accent-hover min-w-[100px]">
            {isProcessing ? 'Processing...' : 'Save Crop'}
          </Button>
        </div>
      </div>
    </div>
  );
};
