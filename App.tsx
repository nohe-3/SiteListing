import React, { useState, useCallback, useEffect } from 'react';
// FIX: Use named imports for react-router-dom components and hooks.
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNavigation from './components/BottomNavigation';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import ChannelPage from './pages/ChannelPage';
import YouPage from './pages/YouPage';
import PlaylistPage from './pages/PlaylistPage';
import ShortsPage from './pages/ShortsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import HistoryPage from './pages/HistoryPage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import ManagementPage from './pages/ManagementPage'; // Import the new page
import LiteModePage from './pages/LiteModePage'; // Import Lite Page
import { useTheme } from './hooks/useTheme';
import { AiProvider } from './contexts/AiContext';
import { usePreference } from './contexts/PreferenceContext';
import HistoryDeletionModal from './components/HistoryDeletionModal';
import SearchHistoryDeletionModal from './components/SearchHistoryDeletionModal';
import UpdateAnnouncementModal from './components/UpdateAnnouncementModal';

const App: React.FC = () => {
  const { theme } = useTheme();
  const { isLiteMode, checkAppVersion } = usePreference();
  const location = useLocation();
  const isPlayerPage = location.pathname.startsWith('/watch');
  const isShortsPage = location.pathname.startsWith('/shorts');

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isPlayerPage);
  const [isHistoryDeletionModalOpen, setIsHistoryDeletionModalOpen] = useState(false);
  const [isSearchHistoryDeletionModalOpen, setIsSearchHistoryDeletionModalOpen] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    if (checkAppVersion()) {
        setShowUpdateModal(true);
    }
  }, [checkAppVersion]);

  useEffect(() => {
    if (isPlayerPage) {
        setIsSidebarOpen(false);
    } else if (!isShortsPage) {
        setIsSidebarOpen(true);
    } else if (isShortsPage) {
        // Shorts page starts with closed sidebar (full screen feel)
        setIsSidebarOpen(false);
    }
  }, [location.pathname, isPlayerPage, isShortsPage]);

  // If Lite Mode is active, render ONLY the Lite Page
  if (isLiteMode) {
      return (
          <>
            <LiteModePage />
            {showUpdateModal && <UpdateAnnouncementModal onClose={() => setShowUpdateModal(false)} />}
          </>
      );
  }

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  
  const openHistoryDeletionModal = useCallback(() => setIsHistoryDeletionModalOpen(true), []);
  const openSearchHistoryDeletionModal = useCallback(() => setIsSearchHistoryDeletionModalOpen(true), []);
  const closeHistoryDeletionModal = useCallback(() => setIsHistoryDeletionModalOpen(false), []);
  const closeSearchHistoryDeletionModal = useCallback(() => setIsSearchHistoryDeletionModalOpen(false), []);

  const getMargin = () => {
    if (isShortsPage) return ''; 
    if (isSidebarOpen) return 'md:ml-60'; 
    if (isPlayerPage && !isSidebarOpen) return ''; 
    return 'md:ml-[72px]';
  };

  const mainContentMargin = getMargin();
  const mainContentPadding = isShortsPage ? '' : 'p-0 md:p-6 pb-16 md:pb-6'; 
  
  const shouldShowSidebar = () => {
    // Show sidebar logic:
    // - Always show if not player/shorts (it handles its own collapsed state)
    // - On Shorts, we ALLOW it to render so the hamburger menu works, but it will overlay.
    if (isPlayerPage && !isSidebarOpen) return false; 
    return true;
  };

  const isTransparentTheme = theme.includes('glass');
  const appBgClass = isTransparentTheme ? 'bg-transparent' : 'bg-yt-white dark:bg-yt-black';

  return (
    <AiProvider>
        <div className={`min-h-screen ${appBgClass}`}>
        <Header 
            toggleSidebar={toggleSidebar} 
            openHistoryDeletionModal={openHistoryDeletionModal}
            openSearchHistoryDeletionModal={openSearchHistoryDeletionModal}
        />
        <div className="flex">
            {shouldShowSidebar() && <Sidebar isOpen={isSidebarOpen} />}
            {/* FIX: Removed key={location.pathname} to prevent full re-renders on URL changes (especially for Shorts navigation) */}
            <main className={`flex-1 mt-14 ${mainContentMargin} ${mainContentPadding} transition-all duration-300 ease-in-out ml-0 overflow-x-hidden animate-fade-in-main`}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/watch/:videoId" element={<VideoPlayerPage />} />
                <Route path="/results" element={<SearchResultsPage />} />
                <Route path="/channel/:channelId" element={<ChannelPage />} />
                <Route path="/you" element={<YouPage />} />
                <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
                {/* Use wildcard to keep component mounted when switching videos */}
                <Route path="/shorts/*" element={<ShortsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/management" element={<ManagementPage />} /> {/* Add new route */}
                <Route path="*" element={<HomePage />} />
            </Routes>
            </main>
        </div>
        <BottomNavigation />
        {isHistoryDeletionModalOpen && (
            <HistoryDeletionModal 
            isOpen={isHistoryDeletionModalOpen} 
            onClose={closeHistoryDeletionModal} 
            />
        )}
        {isSearchHistoryDeletionModalOpen && (
            <SearchHistoryDeletionModal 
            isOpen={isSearchHistoryDeletionModalOpen} 
            onClose={closeSearchHistoryDeletionModal} 
            />
        )}
        {showUpdateModal && (
            <UpdateAnnouncementModal onClose={() => setShowUpdateModal(false)} />
        )}
        </div>
    </AiProvider>
  );
};

export default App;