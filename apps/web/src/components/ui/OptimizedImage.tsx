import React, { useState, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  maxWidth?: number;
}

/**
 * Helper to inject Cloudinary optimization transformations.
 */
export function getOptimizedCloudinaryUrl(url: string, transformations: string): string {
  if (!url || !url.includes('cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }
  const parts = url.split('/image/upload/');
  if (parts.length !== 2) return url;
  return `${parts[0]}/image/upload/${transformations}/${parts[1]}`;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  fallbackSrc = 'https://res.cloudinary.com/cqcc4kuk/image/upload/v1784377900/uqzwaebszrnfqvgdz5du.png', // Default placeholder if loading fails
  maxWidth,
  alt = 'Product Image',
  loading = 'lazy',
  className = '',
  style = {},
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isCloudinary = src && src.includes('cloudinary.com') && src.includes('/image/upload/');

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    if (!src) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    if (isCloudinary) {
      // Apply auto format (WebP/AVIF) and auto quality compression
      let transform = 'f_auto,q_auto';
      if (maxWidth) {
        transform += `,w_${maxWidth},c_limit`;
      }
      setCurrentSrc(getOptimizedCloudinaryUrl(src, transform));
    } else {
      setCurrentSrc(src);
    }
  }, [src, maxWidth, isCloudinary, fallbackSrc]);

  // Generate responsive srcSet for Cloudinary URLs
  const srcSet = isCloudinary && !maxWidth
    ? [360, 540, 720, 1080, 1440]
        .map((w) => `${getOptimizedCloudinaryUrl(src, `f_auto,q_auto,w_${w},c_limit`)} ${w}w`)
        .join(', ')
    : undefined;

  const sizes = isCloudinary && !maxWidth
    ? '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw'
    : undefined;

  return (
    <img
      src={currentSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      onLoad={() => setIsLoaded(true)}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setCurrentSrc(fallbackSrc);
        }
      }}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-40'}`}
      style={{
        ...style,
        transition: 'opacity 0.3s ease-in-out',
      }}
      {...props}
    />
  );
};

export default OptimizedImage;
