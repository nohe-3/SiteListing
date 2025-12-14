import React from 'react';
// FIX: Use named import for NavLink from react-router-dom
import { NavLink } from 'react-router-dom';
import { HomeIcon, ShortsIcon, SubscriptionsIcon, YouIcon } from './icons/Icons';
import { useTheme } from '../hooks/useTheme';

const BottomNavigation: React.FC = () => {
  const { theme } = useTheme();
  
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 ${
      isActive ? 'text-black dark:text-white' : 'text-black dark:text-white'
    }`;
  
  let bgClass = 'bg-yt-white dark:bg-yt-black';
  if (theme === 'light-glass') {
    // Use the class defined in styles.css for the strong glass effect
    bgClass = 'glass-panel border-t border-white/20';
  }


  return (
    <div className={`fixed bottom-0 left-0 right-0 h-12 ${bgClass} border-t border-yt-spec-light-20 dark:border-yt-spec-20 flex items-center justify-around z-50 md:hidden transition-colors duration-300`}>
      <NavLink to="/" className={navClass}>
        <HomeIcon />
        <span className="text-[10px]">ホーム</span>
      </NavLink>
      <NavLink to="/shorts" className={navClass}>
        <ShortsIcon />
        <span className="text-[10px]">ショート</span>
      </NavLink>
       <NavLink to="/subscriptions" className={navClass}>
        <SubscriptionsIcon />
        <span className="text-[10px]">登録チャンネル</span>
      </NavLink>
      <NavLink to="/you" className={navClass}>
        <YouIcon />
        <span className="text-[10px]">マイページ</span>
      </NavLink>
    </div>
  );
};

export default BottomNavigation;