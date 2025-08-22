import { useState, useEffect, useRef, useCallback } from "react";

interface UseImageLoaderOptions {
  src: string;
  threshold?: number;
  rootMargin?: string;
}

interface UseImageLoaderReturn {
  isLoading: boolean;
  isError: boolean;
  isVisible: boolean;
  imageRef: React.RefObject<HTMLDivElement>;
  retryLoad: () => void;
}

export const useImageLoader = ({
  src,
  threshold = 0.1,
  rootMargin = "50px",
}: UseImageLoaderOptions): UseImageLoaderReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imageRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !shouldLoad) {
          setIsVisible(true);
          setShouldLoad(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imageRef.current);

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [threshold, rootMargin, shouldLoad]);

  // Image loading logic
  useEffect(() => {
    if (!shouldLoad) return;

    setIsLoading(true);
    setIsError(false);

    const img = new Image();

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setIsError(true);
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldLoad]);

  const retryLoad = useCallback(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    } else {
      setIsError(false);
      setIsLoading(true);

      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => {
        setIsLoading(false);
        setIsError(true);
      };
      img.src = src;
    }
  }, [src, shouldLoad]);

  return {
    isLoading: shouldLoad ? isLoading : true,
    isError,
    isVisible,
    imageRef,
    retryLoad,
  };
};
