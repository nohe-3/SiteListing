import React from 'react';

const VideoCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="relative">
        <div className="w-full aspect-video rounded-xl bg-yt-light dark:bg-yt-dark-gray"></div>
      </div>
      <div className="flex mt-3">
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-yt-light dark:bg-yt-dark-gray"></div>
        </div>
        <div className="ml-3 flex-1">
          <div className="h-4 bg-yt-light dark:bg-yt-dark-gray rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-yt-light dark:bg-yt-dark-gray rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

export default VideoCardSkeleton;