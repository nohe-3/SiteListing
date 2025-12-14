import React from 'react';
import type { Notification } from '../types';
import NotificationItem from './NotificationItem';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ notifications, onClose }) => {
  return (
    <div className="absolute top-12 right-0 w-80 sm:w-96 bg-yt-white dark:bg-yt-light-black rounded-lg shadow-lg border border-yt-spec-light-20 dark:border-yt-spec-20 flex flex-col">
      <div className="px-4 py-2 font-semibold text-black dark:text-white">通知</div>
      <hr className="border-yt-spec-light-20 dark:border-yt-spec-20" />
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(notification => 
            <NotificationItem key={notification.id} notification={notification} onClose={onClose} />
          )
        ) : (
          <p className="text-center text-yt-light-gray p-4">新しい通知はありません。</p>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;