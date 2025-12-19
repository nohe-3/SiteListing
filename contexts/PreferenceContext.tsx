
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { extractKeywords } from '../utils/xrai';
import type { Video } from '../types';

export interface BlockedChannel {
    id: string;
    name: string;
    avatarUrl: string;
}

export interface HiddenVideo {
    id: string;
    title: string;
    channelName: string;
}

interface PreferenceContextType {
  ngKeywords: string[];
  ngChannels: BlockedChannel[];
  hiddenVideos: HiddenVideo[];
  negativeKeywords: Map<string, number>;
  isShortsAutoplayEnabled: boolean;
  
  // Lite Mode State
  isLiteMode: boolean;
  toggleLiteMode: () => void;

  // Guest Mode (Incognito)
  isGuestMode: boolean;
  toggleGuestMode: () => void;

  // Persistent Player Mode ('player' or 'stream')
  defaultPlayerMode: 'player' | 'stream';
  setDefaultPlayerMode: (mode: 'player' | 'stream') => void;

  // Versioning for Update Notification
  checkAppVersion: () => boolean; 
  
  addNgKeyword: (keyword: string) => void;
  removeNgKeyword: (keyword: string) => void;
  
  addNgChannel: (channel: BlockedChannel) => void;
  removeNgChannel: (channelId: string) => void;
  isNgChannel: (channelId: string) => boolean;

  addHiddenVideo: (video: HiddenVideo) => void;
  unhideVideo: (videoId: string) => void;
  isvideoHidden: (videoId: string) => boolean;
  removeNegativeProfileForVideos: (videos: Video[]) => void;

  toggleShortsAutoplay: () => void;
  exportUserData: (isAuto?: boolean) => void;
  importUserData: (file: File) => Promise<void>;
  
  // Auto Backup Trigger
  notifyAction: () => void;
}

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

const CURRENT_APP_VERSION = "3.4.0"; 

export const PreferenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialization Guard
  const isInitialized = useRef(false);

  const [ngKeywords, setNgKeywords] = useState<string[]>([]);
  const [ngChannels, setNgChannels] = useState<BlockedChannel[]>([]);
  const [hiddenVideos, setHiddenVideos] = useState<HiddenVideo[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<Map<string, number>>(new Map());
  const [isShortsAutoplayEnabled, setIsShortsAutoplayEnabled] = useState<boolean>(true);
  const [isLiteMode, setIsLiteMode] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [defaultPlayerMode, _setDefaultPlayerMode] = useState<'player' | 'stream'>('player');

  // Initial Read
  useEffect(() => {
      try {
          const keys = JSON.parse(window.localStorage.getItem('ngKeywords') || '[]');
          setNgKeywords(keys);

          const channels = JSON.parse(window.localStorage.getItem('ngChannels') || '[]');
          if (channels.length === 0 || typeof channels[0] !== 'string') setNgChannels(channels);

          const hidden = JSON.parse(window.localStorage.getItem('hiddenVideos') || '[]');
          if (hidden.length === 0 || typeof hidden[0] !== 'string') setHiddenVideos(hidden);

          const neg = JSON.parse(window.localStorage.getItem('negativeKeywords') || '[]');
          setNegativeKeywords(new Map(neg));

          const autoplay = window.localStorage.getItem('isShortsAutoplayEnabled');
          setIsShortsAutoplayEnabled(autoplay !== 'false');

          const lite = window.localStorage.getItem('isLiteMode');
          setIsLiteMode(lite === 'true');

          const mode = window.localStorage.getItem('defaultPlayerMode');
          if (mode === 'stream') _setDefaultPlayerMode('stream');

      } catch (e) {
          console.error("Preferences load error", e);
      } finally {
          isInitialized.current = true;
      }
  }, []);

  // Sync Writes - guarded by isInitialized
  useEffect(() => { if (isInitialized.current) localStorage.setItem('ngKeywords', JSON.stringify(ngKeywords)); }, [ngKeywords]);
  useEffect(() => { if (isInitialized.current) localStorage.setItem('ngChannels', JSON.stringify(ngChannels)); }, [ngChannels]);
  useEffect(() => { if (isInitialized.current) localStorage.setItem('hiddenVideos', JSON.stringify(hiddenVideos)); }, [hiddenVideos]);
  useEffect(() => { if (isInitialized.current) localStorage.setItem('negativeKeywords', JSON.stringify(Array.from(negativeKeywords.entries()))); }, [negativeKeywords]);
  useEffect(() => { if (isInitialized.current) localStorage.setItem('isShortsAutoplayEnabled', String(isShortsAutoplayEnabled)); }, [isShortsAutoplayEnabled]);
  useEffect(() => { if (isInitialized.current) localStorage.setItem('isLiteMode', String(isLiteMode)); }, [isLiteMode]);

  const addNgKeyword = (k: string) => !ngKeywords.includes(k) && setNgKeywords(p => [...p, k]);
  const removeNgKeyword = (k: string) => setNgKeywords(p => p.filter(x => x !== k));

  const addNgChannel = (channel: BlockedChannel) => !ngChannels.some(c => c.id === channel.id) && setNgChannels(p => [...p, channel]);
  const removeNgChannel = (id: string) => setNgChannels(p => p.filter(c => c.id !== id));
  const isNgChannel = (id: string) => ngChannels.some(c => c.id === id);

  const addHiddenVideo = (video: HiddenVideo) => {
      if (!hiddenVideos.some(v => v.id === video.id)) {
          setHiddenVideos(prev => [...prev, video]);
      }
      const keywords = [ ...extractKeywords(video.title), ...extractKeywords(video.channelName) ];
      setNegativeKeywords(prev => {
          const newMap = new Map<string, number>(prev);
          keywords.forEach(k => newMap.set(k, (newMap.get(k) || 0) + 1));
          return newMap;
      });
      notifyAction();
  };

  const unhideVideo = (videoId: string) => {
    const videoToUnhide = hiddenVideos.find(v => v.id === videoId);
    if (!videoToUnhide) return;
    setHiddenVideos(prev => prev.filter(v => v.id !== videoId));
    notifyAction();
  };
  
  const removeNegativeProfileForVideos = (videos: Video[]) => {
    if (videos.length === 0) return;
    const idsToRemove = new Set(videos.map(v => v.id));
    setHiddenVideos(prev => prev.filter(v => !idsToRemove.has(v.id)));
    notifyAction();
  };

  const isvideoHidden = (videoId: string) => hiddenVideos.some(v => v.id === videoId);

  const toggleShortsAutoplay = () => {
    setIsShortsAutoplayEnabled(prev => !prev);
  };

  const toggleLiteMode = useCallback(() => {
      const nextState = !isLiteMode;
      setIsLiteMode(nextState);
      localStorage.setItem('isLiteMode', String(nextState));
      setTimeout(() => window.location.reload(), 50);
  }, [isLiteMode]);

  const toggleGuestMode = useCallback(() => {
      setIsGuestMode(prev => !prev);
  }, []);

  const setDefaultPlayerMode = (mode: 'player' | 'stream') => {
      _setDefaultPlayerMode(mode);
      localStorage.setItem('defaultPlayerMode', mode);
  };

  const checkAppVersion = () => {
      const lastSeen = localStorage.getItem('lastSeenAppVersion');
      if (lastSeen !== CURRENT_APP_VERSION) {
          localStorage.setItem('lastSeenAppVersion', CURRENT_APP_VERSION);
          return true;
      }
      return false;
  };

  const restoreData = (json: any) => {
      if (json.subscriptions) localStorage.setItem('subscribedChannels', JSON.stringify(json.subscriptions));
      if (json.history) localStorage.setItem('videoHistory', JSON.stringify(json.history));
      if (json.playlists) localStorage.setItem('playlists', JSON.stringify(json.playlists || []));
      
      if (json.preferences) {
        const p = json.preferences;
        localStorage.setItem('ngKeywords', JSON.stringify(p.ngKeywords || []));
        localStorage.setItem('ngChannels', JSON.stringify(p.ngChannels || []));
        const hidden = Array.isArray(p.hiddenVideos) ? p.hiddenVideos : [];
        localStorage.setItem('hiddenVideos', JSON.stringify(hidden));
        localStorage.setItem('isShortsAutoplayEnabled', String(p.isShortsAutoplayEnabled ?? true));
        if(p.isLiteMode !== undefined) localStorage.setItem('isLiteMode', String(p.isLiteMode));
        if(p.defaultPlayerMode) localStorage.setItem('defaultPlayerMode', p.defaultPlayerMode);
      }
  };

  const exportUserData = (isAuto: boolean = false) => {
    const data = {
      timestamp: new Date().toISOString(),
      version: '3.4',
      subscriptions: JSON.parse(localStorage.getItem('subscribedChannels') || '[]'),
      history: JSON.parse(localStorage.getItem('videoHistory') || '[]'),
      playlists: JSON.parse(localStorage.getItem('playlists') || '[]'),
      preferences: { 
          ngKeywords, ngChannels, hiddenVideos, isShortsAutoplayEnabled, 
          isLiteMode, defaultPlayerMode 
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = isAuto ? 'xeroxyt_auto_backup' : 'xeroxyt_backup';
    a.download = `${prefix}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importUserData = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (!json.subscriptions) throw new Error('Invalid backup file');
          restoreData(json);
          window.location.reload();
          resolve();
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。');
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  };

  const notifyAction = useCallback(() => {
      if (isGuestMode) return; 
      
      const lastBackupStr = window.localStorage.getItem('lastAutoBackupDate');
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      
      let lastBackup = 0;
      
      if (!lastBackupStr) {
          // If never backed up, set current time as reference but don't backup immediately
          // to avoid annoying popups on fresh install.
          try {
              window.localStorage.setItem('lastAutoBackupDate', String(now));
          } catch(e) { /* ignore quota error */ }
          return;
      } else {
          lastBackup = parseInt(lastBackupStr, 10);
          if (isNaN(lastBackup)) lastBackup = 0;
      }

      if ((now - lastBackup) >= threeDaysMs) {
          exportUserData(true);
          try {
              window.localStorage.setItem('lastAutoBackupDate', String(now));
          } catch(e) { /* ignore quota error */ }
      }
  }, [isGuestMode]);

  return (
    <PreferenceContext.Provider value={{
      ngKeywords, ngChannels, hiddenVideos, negativeKeywords, isShortsAutoplayEnabled,
      isLiteMode, toggleLiteMode,
      isGuestMode, toggleGuestMode,
      defaultPlayerMode, setDefaultPlayerMode,
      checkAppVersion,
      addNgKeyword, removeNgKeyword, addNgChannel, removeNgChannel, isNgChannel,
      addHiddenVideo, unhideVideo, isvideoHidden, removeNegativeProfileForVideos,
      toggleShortsAutoplay, exportUserData, importUserData,
      notifyAction
    }}>
      {children}
    </PreferenceContext.Provider>
  );
};

export const usePreference = (): PreferenceContextType => {
  const context = useContext(PreferenceContext);
  if (context === undefined) {
    throw new Error('usePreference must be used within a PreferenceProvider');
  }
  return context;
};
