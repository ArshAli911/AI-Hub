import React, { useState, useEffect, memo } from 'react';
import { 
  Image, 
  ImageProps, 
  ImageStyle, 
  View, 
  ActivityIndicator, 
  StyleSheet,
  Dimensions 
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: string | { uri: string } | number;
  placeholder?: string;
  fallback?: string;
  width?: number;
  height?: number;
  quality?: number; // 0-100
  format?: 'webp' | 'jpeg' | 'png';
  blur?: number;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  showLoadingIndicator?: boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  placeholder,
  fallback,
  width,
  height,
  quality = 80,
  format = 'webp',
  blur = 0,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  showLoadingIndicator = true,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSource, setImageSource] = useState<any>(null);

  useEffect(() => {
    processImageSource();
  }, [source, width, height, quality, format]);

  const processImageSource = () => {
    if (typeof source === 'number') {
      // Local image
      setImageSource(source);
      setLoading(false);
      return;
    }

    if (typeof source === 'string' || (typeof source === 'object' && source.uri)) {
      const uri = typeof source === 'string' ? source : source.uri;
      
      // Optimize remote images
      const optimizedUri = optimizeImageUrl(uri, {
        width,
        height,
        quality,
        format,
      });

      setImageSource({ uri: optimizedUri });
    }
  };

  const optimizeImageUrl = (
    uri: string, 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    }
  ): string => {
    // If it's already optimized or a local file, return as is
    if (uri.includes('?') || uri.startsWith('file://') || uri.startsWith('data:')) {
      return uri;
    }

    // For common image services, add optimization parameters
    const url = new URL(uri);
    
    // Cloudinary optimization
    if (url.hostname.includes('cloudinary.com')) {
      const pathParts = url.pathname.split('/');
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex !== -1) {
        const transformations = [];
        if (options.width) transformations.push(`w_${options.width}`);
        if (options.height) transformations.push(`h_${options.height}`);
        if (options.quality) transformations.push(`q_${options.quality}`);
        if (options.format) transformations.push(`f_${options.format}`);
        
        pathParts.splice(uploadIndex + 1, 0, transformations.join(','));
        url.pathname = pathParts.join('/');
      }
    }
    
    // Firebase Storage optimization
    else if (url.hostname.includes('firebasestorage.googleapis.com')) {
      if (options.width) url.searchParams.set('w', options.width.toString());
      if (options.height) url.searchParams.set('h', options.height.toString());
      if (options.quality) url.searchParams.set('q', options.quality.toString());
    }
    
    // Generic optimization for other services
    else {
      if (options.width) url.searchParams.set('width', options.width.toString());
      if (options.height) url.searchParams.set('height', options.height.toString());
      if (options.quality) url.searchParams.set('quality', options.quality.toString());
      if (options.format) url.searchParams.set('format', options.format);
    }

    return url.toString();
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
  };

  const handleError = (err: any) => {
    setLoading(false);
    setError(true);
    onError?.(err);
    
    // Try fallback image
    if (fallback && imageSource?.uri !== fallback) {
      setImageSource({ uri: fallback });
      setError(false);
    }
  };

  const getImageStyle = (): ImageStyle => {
    const baseStyle: ImageStyle = {
      width: width || '100%',
      height: height || 200,
    };

    if (Array.isArray(style)) {
      return [baseStyle, ...style] as ImageStyle;
    }

    return { ...baseStyle, ...style };
  };

  // Use Expo Image for better performance and features
  if (ExpoImage) {
    return (
      <View style={getImageStyle()}>
        <ExpoImage
          source={imageSource}
          placeholder={placeholder}
          contentFit="cover"
          transition={200}
          cachePolicy={cachePolicy}
          priority={priority}
          onLoadStart={handleLoadStart}
          onLoad={handleLoadEnd}
          onError={handleError}
          style={StyleSheet.absoluteFillObject}
          {...props}
        />
        
        {loading && showLoadingIndicator && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#6200EE" />
          </View>
        )}
      </View>
    );
  }

  // Fallback to React Native Image
  return (
    <View style={getImageStyle()}>
      <Image
        source={imageSource}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        {...props}
      />
      
      {loading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#6200EE" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

// Hook for preloading images
export const useImagePreloader = (urls: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const preloadImages = async () => {
    setLoading(true);
    const promises = urls.map(url => 
      Image.prefetch(url).then(() => url).catch(() => null)
    );
    
    const results = await Promise.allSettled(promises);
    const loaded = results
      .filter((result): result is PromiseFulfilledResult<string> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    setLoadedImages(new Set(loaded));
    setLoading(false);
  };

  useEffect(() => {
    if (urls.length > 0) {
      preloadImages();
    }
  }, [urls]);

  return { loadedImages, loading, preloadImages };
};