import React, { useEffect, useState } from 'react';
import { fabric } from 'fabric';

interface MinimapProps {
  canvas: fabric.Canvas | null;
}

export const Minimap: React.FC<MinimapProps> = ({ canvas }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!canvas) return;

    let rafId: number | null = null;
    const renderMap = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setTick(t => t + 1);
      });
    };

    canvas.on('after:render', renderMap);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      canvas.off('after:render', renderMap);
    };
  }, [canvas]);


  if (!canvas) return null;

  const objects = canvas.getObjects();
  if (objects.length === 0) return null;

  // Calculate bounding box of all objects
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  objects.forEach(obj => {
    const rect = obj.getBoundingRect(true, true); // absolute bounding box
    if (rect.left < minX) minX = rect.left;
    if (rect.top < minY) minY = rect.top;
    if (rect.left + rect.width > maxX) maxX = rect.left + rect.width;
    if (rect.top + rect.height > maxY) maxY = rect.top + rect.height;
  });

  // Calculate viewport bounding box
  const vpt = canvas.viewportTransform;
  let viewMinX = 0, viewMinY = 0, viewMaxX = canvas.getWidth(), viewMaxY = canvas.getHeight();
  if (vpt) {
    viewMinX = -vpt[4] / vpt[0];
    viewMinY = -vpt[5] / vpt[3];
    viewMaxX = (canvas.getWidth() - vpt[4]) / vpt[0];
    viewMaxY = (canvas.getHeight() - vpt[5]) / vpt[3];
  }

  // Include viewport in the bounds to ensure the map always shows where we are
  minX = Math.min(minX, viewMinX);
  minY = Math.min(minY, viewMinY);
  maxX = Math.max(maxX, viewMaxX);
  maxY = Math.max(maxY, viewMaxY);

  // Add some padding
  const padding = 100;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;
  
  if (width <= 0 || height <= 0) return null;

  const minimapSize = 120;
  const scale = Math.min(minimapSize / width, minimapSize / height);

  return (
    <div className="absolute bottom-6 right-6 z-40 bg-surface border border-border shadow-lg rounded-lg p-2 pointer-events-none opacity-50 transition-opacity hover:opacity-100">
      <svg 
        width={width * scale} 
        height={height * scale} 
      >
        {/* Draw objects */}
        {objects.map((obj, i) => {
          const rect = obj.getBoundingRect(true, true);
          return (
            <rect
              key={i}
              x={(rect.left - minX) * scale}
              y={(rect.top - minY) * scale}
              width={rect.width * scale}
              height={rect.height * scale}
              fill="currentColor"
              className="text-text-muted"
            />
          );
        })}
        {/* Draw viewport */}
        <rect
          x={(viewMinX - minX) * scale}
          y={(viewMinY - minY) * scale}
          width={(viewMaxX - viewMinX) * scale}
          height={(viewMaxY - viewMinY) * scale}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};
