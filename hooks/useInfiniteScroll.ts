
import { useRef, useCallback } from 'react';

export const useInfiniteScroll = (callback: () => void, hasMore: boolean, isLoading: boolean) => {
    const observer = useRef<IntersectionObserver | null>(null);
    
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                callback();
            }
        }, {
            // トリガー位置を大幅に広げて、スクロールの下端に着く前に次の読み込みを開始する
            rootMargin: '1500px', 
        });
        
        if (node) observer.current.observe(node);
    }, [callback, hasMore, isLoading]);
    
    return lastElementRef;
};