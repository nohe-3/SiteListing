import React from 'react';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import type { Video } from '../types';

interface RelatedVideoCardProps {
  video: Video;
}

const RelatedVideoCard: React.FC<RelatedVideoCardProps> = ({ video }) => {
  return (
    <Link to={`/watch/${video.id}`} className="flex gap-2 group">
        <div className="relative flex-shrink-0 w-40">
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-auto aspect-video object-cover rounded-lg" />
            <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded-md">
                {video.duration}
            </span>
        </div>
        <div className="flex-1">
            <h3 className="text-black dark:text-white text-sm font-semibold leading-snug break-words max-h-10 overflow-hidden line-clamp-2 group-hover:text-opacity-80">
                {video.title}
            </h3>
            <div className="text-yt-light-gray text-xs mt-1">
                <p className="hover:text-black dark:hover:text-white block truncate">{video.channelName}</p>
                <p>
                    {[video.views, video.uploadedAt].filter(Boolean).join(' \u2022 ')}
                </p>
            </div>
        </div>
    </Link>
  );
};

export default RelatedVideoCard;