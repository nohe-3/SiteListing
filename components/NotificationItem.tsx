import React from 'react';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import type { Notification } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { channel, video } = notification;

  return (
    <Link
      to={`/watch/${video.id}`}
      onClick={onClose}
      className="flex items-start px-4 py-3 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 border-b border-yt-spec-light-20 dark:border-yt-spec-20 last:border-b-0"
    >
      <div className="flex-shrink-0 mt-1">
        <img src={channel.avatarUrl} alt={channel.name} className="w-10 h-10 rounded-full" />
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm text-black dark:text-white line-clamp-2">
          <strong>{channel.name}</strong> が新しい動画を公開しました: {video.title}
        </p>
        <p className="text-xs text-yt-blue mt-1">{video.uploadedAt}</p>
      </div>
      <div className="flex-shrink-0 ml-4">
        <img src={video.thumbnailUrl} alt={video.title} className="w-28 aspect-video rounded-md" />
      </div>
    </Link>
  );
};

export default NotificationItem;