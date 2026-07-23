export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Max dimension to maintain high sharpness but prevent excessively large files
        const MAX_SIZE = 2500;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string); 
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.9)); 
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

export const cropImage = (
  imageSrc: string, 
  crop: { x: number; y: number; width: number; height: number },
  renderedWidth: number,
  renderedHeight: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleX = img.naturalWidth / renderedWidth;
      const scaleY = img.naturalHeight / renderedHeight;
      
      const actualCropWidth = crop.width * scaleX;
      const actualCropHeight = crop.height * scaleY;
      
      let finalWidth = actualCropWidth;
      let finalHeight = actualCropHeight;
      
      const MAX_SIZE = 2500;
      if (finalWidth > finalHeight && finalWidth > MAX_SIZE) {
        finalHeight = Math.round((finalHeight * MAX_SIZE) / finalWidth);
        finalWidth = MAX_SIZE;
      } else if (finalHeight > MAX_SIZE) {
        finalWidth = Math.round((finalWidth * MAX_SIZE) / finalHeight);
        finalHeight = MAX_SIZE;
      }

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      
      ctx.drawImage(
        img,
        crop.x * scaleX,
        crop.y * scaleY,
        actualCropWidth,
        actualCropHeight,
        0,
        0,
        finalWidth,
        finalHeight
      );
      
      resolve(canvas.toDataURL('image/webp', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageSrc;
  });
};
