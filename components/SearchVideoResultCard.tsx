import React, { useState, useRef, useEffect } from 'react';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import type { Video } from '../types';
import { ChevronRightIcon } from './icons/Icons';

interface SearchVideoResultCardProps {
  video: Video;
}

const SearchVideoResultCard: React.FC<SearchVideoResultCardProps> = ({ video }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (
              menuRef.current && !menuRef.current.contains(event.target as Node) &&
              triggerRef.current && !triggerRef.current.contains(event.target as Node)
          ) {
              setIsMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasCollaborators = video.collaborators && video.collaborators.length > 1;

  return (
    <Link to={`/watch/${video.id}`} className="flex flex-col sm:flex-row gap-4 group mb-4">
      {/* Thumbnail - Increased size */}
      <div className="relative flex-shrink-0 w-full sm:w-[360px] aspect-video rounded-xl overflow-hidden">
        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded-md">
          {video.duration}
        </span>
      </div>

      {/* Video Details */}
      <div className="flex-1 py-1 min-w-0">
        <h3 className="text-black dark:text-white text-lg sm:text-xl font-normal leading-snug break-words line-clamp-2 mb-1">
          {video.title}
        </h3>
        <p className="text-yt-light-gray text-xs sm:text-sm mb-2">
            {[video.views?.includes('不明') ? null : video.views, video.uploadedAt].filter(Boolean).join(' \u2022 ')}
        </p>

        {/* Channel Info */}
        {video.channelId && (
            <div className="flex items-center mb-2 relative">
                {video.channelAvatarUrl ? (
                    <img src={video.channelAvatarUrl} alt={video.channelName} className="w-6 h-6 rounded-full mr-2" />
                ) : (
                    <div className="w-6 h-6 rounded-full mr-2 bg-yt-gray"></div>
                )}
                
                {hasCollaborators ? (
                    <div className="relative">
                         <div 
                            ref={triggerRef}
                            className="flex items-center text-yt-light-gray text-sm hover:text-black dark:hover:text-white cursor-pointer select-none"
                            onClick={toggleMenu}
                         >
                            <span className="truncate">{video.channelName} 他</span>
                            <div className={`transform transition-transform duration-200 scale-75 ${isMenuOpen ? 'rotate-90' : ''}`}>
                                <ChevronRightIcon />
                            </div>
                         </div>
                         {isMenuOpen && (
                            <div ref={menuRef} className="absolute top-full left-0 mt-1 w-56 bg-yt-white dark:bg-yt-light-black rounded-lg shadow-xl border border-yt-spec-light-20 dark:border-yt-spec-20 z-50 overflow-hidden">
                                <div className="px-3 py-2 text-xs font-bold text-yt-light-gray border-b border-yt-spec-light-20 dark:border-yt-spec-20">
                                    チャンネルを選択
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {video.collaborators?.map(collab => (
                                        <Link 
                                            key={collab.id} 
                                            to={`/channel/${collab.id}`}
                                            className="flex items-center px-3 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10"
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                                        >
                                            <img src={collab.avatarUrl} alt={collab.name} className="w-6 h-6 rounded-full mr-2" />
                                            <span className="text-xs font-semibold text-black dark:text-white truncate">{collab.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to={`/channel/${video.channelId}`} className="text-yt-light-gray text-sm hover:text-black dark:hover:text-white truncate" onClick={e => e.stopPropagation()}>
                        {video.channelName}
                    </Link>
                )}
            </div>
        )}

        {/* Description Snippet */}
        {video.descriptionSnippet && (
            <p className="text-yt-light-gray text-xs sm:text-sm line-clamp-2 hidden sm:block">
                {video.descriptionSnippet}
            </p>
        )}
      </div>
    </Link>
  );
};

export default SearchVideoResultCard;