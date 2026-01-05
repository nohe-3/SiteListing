
import React, { useState, useEffect, useRef, useCallback } from 'react';
// FIX: Use named imports for react-router-dom components and hooks.
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MenuIcon, SearchIcon, SettingsIcon, SaveIcon, DownloadIcon, TrashIcon, HistoryIcon, CheckIcon, SunIcon, MoonIcon, ShareIcon, XeroxLogo, IncognitoIcon, MicIcon } from './icons/Icons';
import { useSearchHistory } from '../contexts/SearchHistoryContext';
import { usePreference } from '../contexts/PreferenceContext';
import { useHistory } from '../contexts/HistoryContext';
import { useTheme, type Theme } from '../hooks/useTheme';
import { getSearchSuggestions } from '../utils/api';

interface HeaderProps {
  toggleSidebar: () => void;
  openHistoryDeletionModal: () => void;
  openSearchHistoryDeletionModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, openHistoryDeletionModal, openSearchHistoryDeletionModal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [useProxy, setUseProxy] = useState(localStorage.getItem('useChannelHomeProxy') !== 'false');
  
  // Search Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const { searchHistory, addSearchTerm, clearSearchHistory } = useSearchHistory();
  const { exportUserData, importUserData, isShortsAutoplayEnabled, toggleShortsAutoplay, toggleLiteMode, isGuestMode, toggleGuestMode } = usePreference();
  const { clearHistory } = useHistory();
  const navigate = useNavigate();
  const location = useLocation();
  const settingsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URLと検索バーの同期、およびページ遷移時のクリア処理
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const queryParam = params.get('search_query');

      if (location.pathname === '/results' && queryParam) {
          setSearchQuery(queryParam);
      } else {
          setSearchQuery('');
      }
      setShowSuggestions(false);
  }, [location.pathname, location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addSearchTerm(searchQuery.trim());
      navigate(`/results?search_query=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      // Focus out to hide keyboard on mobile
      (document.activeElement as HTMLElement)?.blur();
    }
  };
  
  const handleSuggestionClick = (term: string) => {
      setSearchQuery(term);
      addSearchTerm(term);
      navigate(`/results?search_query=${encodeURIComponent(term)}`);
      setShowSuggestions(false);
  };

  const fetchSuggestions = useCallback(async (query: string) => {
      if (!query.trim()) {
          setSuggestions([]);
          return;
      }
      // Combine local history matches and API suggestions
      // const localMatches = searchHistory.filter(term => term.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
      const apiSuggestions = await getSearchSuggestions(query);
      
      // Deduplicate
      // const combined = Array.from(new Set([...localMatches, ...apiSuggestions])).slice(0, 10);
      setSuggestions(apiSuggestions.slice(0, 10));
  }, []);

  useEffect(() => {
      const timer = setTimeout(() => {
          if (searchQuery) fetchSuggestions(searchQuery);
      }, 200); // Debounce
      return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  const handleSettingsClick = () => {
      setIsSettingsOpen(prev => !prev);
  };

  const toggleProxy = () => {
      const newValue = !useProxy;
      setUseProxy(newValue);
      localStorage.setItem('useChannelHomeProxy', String(newValue));
      window.location.reload();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          await importUserData(file);
      }
  };

  const handleClearAllHistory = () => {
      if (window.confirm('視聴履歴をすべて削除しますか？この操作は取り消せません。')) {
          clearHistory();
          alert('視聴履歴を削除しました。');
      }
  };

  const handleClearAllSearchHistory = () => {
      if (window.confirm('検索履歴をすべて削除しますか？この操作は取り消せません。')) {
          clearSearchHistory();
          alert('検索履歴を削除しました。');
      }
  };

  const handleResetUserData = () => {
    if (window.confirm('警告: すべてのユーザーデータ（登録チャンネル、履歴、設定など）がリセットされます。この操作は元に戻せません。よろしいですか？')) {
        const currentTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (currentTheme) {
            localStorage.setItem('theme', currentTheme);
        }
        window.location.reload();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
            setIsSettingsOpen(false);
        }
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
            setIsInputFocused(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  let headerBgClass = 'bg-yt-white dark:bg-yt-black';
  if (theme === 'light-glass') {
    headerBgClass = 'glass-panel';
  }

  // Determine logo variant
  const logoVariant = theme === 'light-glass' ? 'glass' : theme === 'light' ? 'light' : 'dark';

  const ThemeSelectItem: React.FC<{ value: Theme, label: string, icon: React.ReactNode }> = ({ value, label, icon }) => (
    <button
        onClick={() => setTheme(value)}
        className="w-full text-left flex items-center justify-between px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white"
    >
        <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
        </div>
        {theme === value && <CheckIcon />}
    </button>
  );

  return (
    <header className={`fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 transition-colors duration-300 ${headerBgClass}`}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 active:scale-95 transform transition-transform duration-150 hidden md:block" aria-label="サイドバーの切り替え">
          <MenuIcon />
        </button>
        <Link to="/" className="flex items-center gap-1" aria-label="YouTubeホーム">
            <XeroxLogo className="h-8 w-auto" variant={logoVariant} />
            <div className="hidden sm:flex items-baseline relative top-[-2px]">
                <span className="text-black dark:text-white text-xl font-bold tracking-tighter font-sans">XeroxYT-NTv3</span>
                {isGuestMode && <span className="text-[10px] bg-gray-600 text-white px-1 py-0.5 rounded ml-1 align-top">Guest</span>}
            </div>
        </Link>
      </div>

      {/* Center Section (Search) */}
      <div className="flex-1 flex justify-center max-w-[720px] ml-10 mr-4 relative" ref={searchContainerRef}>
        <div className="flex items-center w-full gap-4">
            <form onSubmit={handleSearch} className={`flex w-full items-center relative ${showSuggestions ? 'z-50' : ''}`}>
                <div className={`flex w-full items-center rounded-l-full border border-r-0 h-10 overflow-hidden bg-white dark:bg-[#121212] relative z-10 transition-colors ${isInputFocused ? 'border-blue-500 ml-0' : 'border-[#ccc] dark:border-[#303030] ml-0 sm:ml-8'}`}>
                    {isInputFocused && (
                        <div className="pl-4 pr-2 text-black dark:text-white hidden sm:block">
                            <SearchIcon />
                        </div>
                    )}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { 
                            setSearchQuery(e.target.value); 
                            if (!showSuggestions) setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            setIsInputFocused(true);
                            setShowSuggestions(true);
                        }}
                        placeholder="検索"
                        className="w-full h-full bg-transparent pl-4 pr-4 text-base text-black dark:text-white placeholder-yt-light-gray focus:outline-none"
                    />
                </div>
                
                <button
                    type="submit"
                    className="bg-[#f8f8f8] dark:bg-[#222222] h-10 px-5 border border-[#ccc] dark:border-[#303030] rounded-r-full hover:bg-[#f0f0f0] dark:hover:bg-[#3d3d3d] transition-colors flex items-center justify-center relative z-10"
                    aria-label="検索"
                >
                    <SearchIcon />
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                    <div className="absolute top-0 left-0 right-0 pt-12 pb-4 bg-white dark:bg-[#212121] rounded-2xl shadow-lg border border-transparent dark:border-[#303030] z-0">
                        {/* 入力がない場合: 履歴の表示 */}
                        {!searchQuery && searchHistory.length > 0 && (
                            <div className="pt-2">
                                {searchHistory.slice(0, 8).map((term, index) => (
                                    <button
                                        key={`hist-${index}`}
                                        onClick={() => handleSuggestionClick(term)}
                                        className="flex items-center w-full px-4 py-1.5 hover:bg-[#f2f2f2] dark:hover:bg-[#3d3d3d] text-left"
                                    >
                                        <div className="mr-4 text-black dark:text-white"><HistoryIcon /></div>
                                        <span className="text-black dark:text-white font-bold flex-1 truncate">{term}</span>
                                        <span 
                                            className="text-yt-blue text-xs hover:underline p-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            削除
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 入力がある場合: API候補の表示 */}
                        {!!searchQuery && suggestions.length > 0 && (
                            <div className="pt-2">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={`sug-${index}`}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="flex items-center w-full px-4 py-1.5 hover:bg-[#f2f2f2] dark:hover:bg-[#3d3d3d] text-left text-black dark:text-white"
                                    >
                                        <div className="mr-4 text-black dark:text-white"><SearchIcon /></div>
                                        <span className="font-semibold">{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </form>

            <button className="flex-shrink-0 w-10 h-10 bg-[#f2f2f2] dark:bg-[#181818] rounded-full flex items-center justify-center hover:bg-[#e5e5e5] dark:hover:bg-[#303030] transition-colors hidden sm:flex">
                <MicIcon />
            </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-0 sm:space-x-2 md:space-x-4">
        {/* Lite Mode Button */}
        <button 
            onClick={toggleLiteMode}
            className="hidden lg:flex items-center justify-center px-3 py-1.5 rounded-full bg-yt-light dark:bg-[#272727] text-black dark:text-white text-sm font-semibold hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f] transition-colors whitespace-nowrap"
        >
            Lite
        </button>

        {/* Guest Mode Toggle */}
        <button 
            onClick={toggleGuestMode}
            className={`p-2 rounded-full transition-colors hidden md:block ${isGuestMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-black dark:text-white'}`}
            title={isGuestMode ? "ゲストモード中 (履歴オフ)" : "ゲストモードへ切り替え"}
        >
            <IncognitoIcon />
        </button>

        <div className="relative" ref={settingsRef}>
            <button 
                onClick={handleSettingsClick}
                className="p-2 rounded-full hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 active:scale-95 transform transition-transform duration-150" 
                aria-label="設定"
            >
                <SettingsIcon />
            </button>
            
            <div className={`absolute top-12 right-0 w-80 bg-yt-white/95 dark:bg-[#212121]/95 backdrop-blur-md rounded-xl shadow-xl border border-black/10 dark:border-white/10 py-2 overflow-hidden z-50 transition-all duration-200 ease-out ${isSettingsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="py-2">
                        <div className="px-4 py-2 text-xs font-bold text-yt-light-gray uppercase tracking-wider">テーマ</div>
                        <ThemeSelectItem value="light-glass" label="ライト (ガラス)" icon={<SunIcon />} />
                        <ThemeSelectItem value="light" label="ライト (標準)" icon={<SunIcon />} />
                        <ThemeSelectItem value="dark" label="ダーク (標準)" icon={<MoonIcon />} />

                        <hr className="my-2 border-yt-spec-light-20 dark:border-yt-spec-20" />
                        <div className="px-4 py-2 text-xs font-bold text-yt-light-gray uppercase tracking-wider">一般設定</div>
                        
                        <button 
                            onClick={() => { toggleGuestMode(); setIsSettingsOpen(false); }}
                            className="w-full text-left flex items-center justify-between px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white md:hidden"
                        >
                            <span>{isGuestMode ? "ゲストモードを終了" : "ゲストモード (履歴オフ)"}</span>
                            {isGuestMode && <CheckIcon />}
                        </button>

                        <button 
                            onClick={toggleLiteMode}
                            className="w-full text-left flex items-center justify-between px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white lg:hidden"
                        >
                            <span>Liteモードに切り替え</span>
                        </button>

                        <label className="flex items-center justify-between px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 cursor-pointer">
                            <span className="text-sm text-black dark:text-white">Proxy経由で取得</span>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    name="toggle" 
                                    id="toggle" 
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5"
                                    checked={useProxy}
                                    onChange={toggleProxy}
                                />
                                <div className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${useProxy ? 'bg-yt-blue' : 'bg-yt-light-gray'}`}></div>
                            </div>
                        </label>
                        <label className="flex items-center justify-between px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 cursor-pointer">
                            <span className="text-sm text-black dark:text-white">ショートを自動再生</span>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    name="shortsAutoplayToggle" 
                                    id="shortsAutoplayToggle" 
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5"
                                    checked={isShortsAutoplayEnabled}
                                    onChange={toggleShortsAutoplay}
                                />
                                <div className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${isShortsAutoplayEnabled ? 'bg-yt-blue' : 'bg-yt-light-gray'}`}></div>
                            </div>
                        </label>

                        <hr className="my-2 border-yt-spec-light-20 dark:border-yt-spec-20" />

                        <div className="px-4 py-2 text-xs font-bold text-yt-light-gray uppercase tracking-wider">コンテンツ管理</div>
                        <Link 
                            to="/management"
                            onClick={() => setIsSettingsOpen(false)}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <SettingsIcon />
                            非表示/ブロックの管理
                        </Link>

                        <hr className="my-2 border-yt-spec-light-20 dark:border-yt-spec-20" />

                        <div className="px-4 py-2 text-xs font-bold text-yt-light-gray uppercase tracking-wider">履歴管理</div>
                        
                        {/* Watch History */}
                        <button 
                            onClick={handleClearAllHistory}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <TrashIcon />
                            全ての視聴履歴を削除
                        </button>
                        <button 
                            onClick={() => { openHistoryDeletionModal(); setIsSettingsOpen(false); }}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <HistoryIcon />
                            視聴履歴を選択して削除
                        </button>

                        <div className="my-1"></div>

                        {/* Search History */}
                        <button 
                            onClick={handleClearAllSearchHistory}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <TrashIcon />
                            全ての検索履歴を削除
                        </button>
                        <button 
                            onClick={() => { openSearchHistoryDeletionModal(); setIsSettingsOpen(false); }}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <SearchIcon />
                            検索履歴を選択して削除
                        </button>

                        <hr className="my-2 border-yt-spec-light-20 dark:border-yt-spec-20" />
                        
                        <div className="px-4 py-2 text-xs font-bold text-yt-light-gray uppercase tracking-wider">データのバックアップ (JSON)</div>
                        
                        <button 
                            onClick={() => exportUserData()}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <DownloadIcon />
                            エクスポート (保存)
                        </button>
                        
                        <button 
                            onClick={handleImportClick}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 text-sm text-black dark:text-white gap-2"
                        >
                            <SaveIcon />
                            インポート (復元)
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileChange} 
                        />
                        
                        <hr className="my-2 border-yt-spec-light-20 dark:border-yt-spec-20" />
                        <div className="px-4 py-2 text-xs font-bold text-yt-light-gray uppercase tracking-wider">データリセット</div>
                        <button 
                            onClick={handleResetUserData}
                            className="w-full text-left flex items-center px-4 py-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-sm text-red-600 dark:text-red-400 gap-2"
                        >
                            <TrashIcon />
                            全ユーザーデータをリセット
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
