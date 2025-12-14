import React from 'react';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import type { Channel } from '../types';

interface SearchChannelResultCardProps {
  channel: Channel;
}

const SearchChannelResultCard: React.FC<SearchChannelResultCardProps> = ({ channel }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 py-4 border-b border-yt-spec-light-20 dark:border-yt-spec-20 w-full max-w-5xl mx-auto">
      <Link to={`/channel/${channel.id}`} className="flex-shrink-0">
        <img 
          src={channel.avatarUrl} 
          alt={channel.name} 
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover" 
        />
      </Link>
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
        <Link to={`/channel/${channel.id}`}>
          <h3 className="text-black dark:text-white text-lg font-semibold">
            {channel.name}
          </h3>
        </Link>
        <p className="text-yt-light-gray text-sm mt-1">
            {channel.subscriberCount && <span>@{channel.name} • チャンネル登録者数 {channel.subscriberCount}</span>}
        </p>
      </div>
      <div className="flex-shrink-0">
        <Link to={`/channel/${channel.id}`} className="bg-black dark:bg-white text-white dark:text-black font-medium px-4 py-2 rounded-full text-sm hover:opacity-90 transition-opacity">
            チャンネル登録
        </Link>
      </div>
    </div>
  );
};

export default SearchChannelResultCard;