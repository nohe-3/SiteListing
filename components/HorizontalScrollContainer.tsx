
import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
}

const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({ children, className = '' }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth;
      setCanScrollLeft(isScrollable && el.scrollLeft > 10); // Small buffer
      setCanScrollRight(isScrollable && Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth - 10);
    } else {
        setCanScrollLeft(false);
        setCanScrollRight(false);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkScrollability();
      const resizeObserver = new ResizeObserver(checkScrollability);
      resizeObserver.observe(el);
      el.addEventListener('scroll', checkScrollability, { passive: true });
      
      // Initial check with a slight delay to allow layout to settle
      setTimeout(checkScrollability, 100);

      return () => {
        resizeObserver.disconnect();
        el.removeEventListener('scroll', checkScrollability);
      };
    }
  }, [children, checkScrollability]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.75;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="overflow-hidden -mx-4 px-4"> {/* Negative margin hack to allow scroll to touch edges while content aligns */}
        <div 
            ref={scrollContainerRef}
            className="flex flex-nowrap space-x-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
        >
            {children}
        </div>
      </div>

      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-yt-white/90 dark:bg-yt-light-black/90 shadow-md border border-yt-spec-light-10 dark:border-yt-spec-20 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-100 hidden sm:flex items-center justify-center"
          aria-label="スクロール（左）"
        >
          <ChevronLeftIcon />
        </button>
      )}
      
      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-yt-white/90 dark:bg-yt-light-black/90 shadow-md border border-yt-spec-light-10 dark:border-yt-spec-20 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-100 hidden sm:flex items-center justify-center"
          aria-label="スクロール（右）"
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
};

export default HorizontalScrollContainer;