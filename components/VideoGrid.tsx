import React from 'react';
import type { Video } from '../types';
import VideoCard from './VideoCard';
import VideoCardSkeleton from './icons/VideoCardSkeleton';

interface VideoGridProps {
  videos: Video[];
  isLoading: boolean;
  hideChannelInfo?: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos, isLoading, hideChannelInfo = false }) => {
  if (isLoading && videos.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
        {Array.from({ length: 20 }).map((_, index) => (
          <VideoCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!videos.length && !isLoading) {
    return <div className="text-center col-span-full">No videos found.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
      {videos.map(video => (
        <VideoCard key={video.id} video={video} hideChannelInfo={hideChannelInfo} />
      ))}
    </div>
  );
};

export default VideoGrid;