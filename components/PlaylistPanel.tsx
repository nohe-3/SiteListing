


import React, { useRef } from 'react';
// FIX: Use named imports for react-router-dom components and hooks.
import { Link, useSearchParams } from 'react-router-dom';
import type { Playlist, Video } from '../types';
import { ShuffleIcon, RepeatIcon, DragHandleIcon } from './icons/Icons';

interface PlaylistPanelProps {
  playlist: Playlist;
  videos: Video[];
  currentVideoId: string;
  isShuffle: boolean;
  isLoop: boolean;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  authorName?: string;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({ playlist, videos, currentVideoId, isShuffle, isLoop, toggleShuffle, toggleLoop, onReorder, authorName }) => {
  const currentIndex = videos.findIndex(v => v.id === currentVideoId);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [searchParams] = useSearchParams();

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;
    onReorder(dragItem.current, dragOverItem.current);
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  const getWatchUrl = (videoId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('list', playlist.id);
    return `/watch/${videoId}?${newParams.toString()}`;
  }

  return (
    <div className="bg-yt-spec-light-10 dark:bg-yt-dark-gray rounded-xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b border-yt-spec-light-20 dark:border-yt-spec-20">
        <h2 className="text-xl font-bold truncate">{playlist.name}</h2>
        <p className="text-sm text-yt-light-gray">{authorName}</p>
        <p className="text-sm text-yt-light-gray mt-1">{`動画 ${currentIndex >= 0 ? currentIndex + 1 : '-'} / ${videos.length}`}</p>
        <div className="flex items-center gap-2 mt-2">
            <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full hover:bg-yt-spec-light-20 dark:hover:bg-yt-spec-20 ${isShuffle ? 'text-yt-blue' : ''}`}
                title="シャッフル"
            >
                <ShuffleIcon className={`w-6 h-6 ${isShuffle ? 'fill-current text-yt-blue' : 'fill-current text-black dark:text-white'}`} />
            </button>
            <button
                onClick={toggleLoop}
                className={`p-2 rounded-full hover:bg-yt-spec-light-20 dark:hover:bg-yt-spec-20 ${isLoop ? 'text-yt-blue' : ''}`}
                title="リピート"
            >
                <RepeatIcon className={`w-6 h-6 ${isLoop ? 'fill-current text-yt-blue' : 'fill-current text-black dark:text-white'}`}/>
            </button>
        </div>
      </div>
      <div className="overflow-y-auto">
        {videos.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            className={`flex items-center group relative ${video.id === currentVideoId ? 'bg-yt-spec-light-20 dark:bg-yt-spec-20' : 'hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'}`}
            draggable
            onDragStart={() => dragItem.current = index}
            onDragEnter={() => dragOverItem.current = index}
            onDragEnd={handleDragSort}
            onDragOver={(e) => e.preventDefault()}
          >
            {video.id === currentVideoId && <div className="absolute left-0 top-0 h-full w-1 bg-yt-red rounded-r-full"></div>}
            <div className="flex items-center text-yt-light-gray px-2">
                 <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                    <DragHandleIcon />
                </div>
            </div>
            <Link
              to={getWatchUrl(video.id)}
              className="flex-1 flex items-center gap-3 py-1 pr-2"
              draggable={false}
            >
                <div className="relative w-24 flex-shrink-0">
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full aspect-video rounded-md" draggable={false} />
                    <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded-sm">{video.duration}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-sm font-semibold truncate">{video.title}</h3>
                  <p className="text-xs text-yt-light-gray truncate">{video.channelName}</p>
                </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistPanel;