
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
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

  // Persistent Player Mode ('player' or 'stream')
  defaultPlayerMode: 'player' | 'stream';
  setDefaultPlayerMode: (mode: 'player' | 'stream') => void;

  // Versioning for Update Notification
  checkAppVersion: () => boolean; // Returns true if update notification should be shown
  
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
  exportUserData: () => void;
  importUserData: (file: File) => Promise<void>;
}

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

// Current version code to track for update modal
const CURRENT_APP_VERSION = "3.3.0"; 

export const PreferenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ngKeywords, setNgKeywords] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem('ngKeywords') || '[]'); } catch { return []; }
  });
  const [ngChannels, setNgChannels] = useState<BlockedChannel[]>(() => {
    try { 
        const data = JSON.parse(window.localStorage.getItem('ngChannels') || '[]');
        if (data.length > 0 && typeof data[0] === 'string') return [];
        return data;
    } catch { return []; }
  });
  
  const [hiddenVideos, setHiddenVideos] = useState<HiddenVideo[]>(() => {
    try { 
        const data = JSON.parse(window.localStorage.getItem('hiddenVideos') || '[]');
        if (data.length > 0 && typeof data[0] === 'string') return [];
        return data;
    } catch { return []; }
  });

  const [negativeKeywords, setNegativeKeywords] = useState<Map<string, number>>(() => {
     try {
         const raw = JSON.parse(window.localStorage.getItem('negativeKeywords') || '[]');
         return new Map<string, number>(raw);
     } catch { return new Map(); }
  });
  
  const [isShortsAutoplayEnabled, setIsShortsAutoplayEnabled] = useState<boolean>(() => {
    try {
        const item = window.localStorage.getItem('isShortsAutoplayEnabled');
        return item !== 'false';
    } catch {
        return true;
    }
  });

  // Lite Mode State
  const [isLiteMode, setIsLiteMode] = useState<boolean>(() => {
      try {
          return window.localStorage.getItem('isLiteMode') === 'true';
      } catch { return false; }
  });

  // Persistent Player Mode
  const [defaultPlayerMode, _setDefaultPlayerMode] = useState<'player' | 'stream'>(() => {
      try {
          const stored = window.localStorage.getItem('defaultPlayerMode');
          return stored === 'stream' ? 'stream' : 'player';
      } catch { return 'player'; }
  });

  useEffect(() => { localStorage.setItem('ngKeywords', JSON.stringify(ngKeywords)); }, [ngKeywords]);
  useEffect(() => { localStorage.setItem('ngChannels', JSON.stringify(ngChannels)); }, [ngChannels]);
  useEffect(() => { localStorage.setItem('hiddenVideos', JSON.stringify(hiddenVideos)); }, [hiddenVideos]);
  useEffect(() => { 
      localStorage.setItem('negativeKeywords', JSON.stringify(Array.from(negativeKeywords.entries()))); 
  }, [negativeKeywords]);
  useEffect(() => {
    localStorage.setItem('isShortsAutoplayEnabled', String(isShortsAutoplayEnabled));
  }, [isShortsAutoplayEnabled]);
  
  useEffect(() => {
      localStorage.setItem('isLiteMode', String(isLiteMode));
  }, [isLiteMode]);

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
  };

  const unhideVideo = (videoId: string) => {
    const videoToUnhide = hiddenVideos.find(v => v.id === videoId);
    if (!videoToUnhide) return;

    setHiddenVideos(prev => prev.filter(v => v.id !== videoId));

    const keywordsToDecrement = [
        ...extractKeywords(videoToUnhide.title),
        ...extractKeywords(videoToUnhide.channelName)
    ];

    setNegativeKeywords(prev => {
        const newMap = new Map<string, number>(prev);
        keywordsToDecrement.forEach(keyword => {
            if (newMap.has(keyword)) {
                const currentWeight = newMap.get(keyword)!;
                if (currentWeight <= 1) newMap.delete(keyword);
                else newMap.set(keyword, currentWeight - 1);
            }
        });
        return newMap;
    });
  };
  
  const removeNegativeProfileForVideos = (videos: Video[]) => {
    if (videos.length === 0) return;
    const idsToRemove = new Set(videos.map(v => v.id));
    setHiddenVideos(prev => prev.filter(v => !idsToRemove.has(v.id)));

    const keywordsToDecrement = videos.flatMap(v => [
        ...extractKeywords(v.title), ...extractKeywords(v.channelName)
    ]);
    setNegativeKeywords(prev => {
        const newMap = new Map<string, number>(prev);
        keywordsToDecrement.forEach(keyword => {
            if (newMap.has(keyword)) {
                const currentWeight = newMap.get(keyword)!;
                if (currentWeight <= 1) newMap.delete(keyword);
                else newMap.set(keyword, currentWeight - 1);
            }
        });
        return newMap;
    });
  };

  const isvideoHidden = (videoId: string) => hiddenVideos.some(v => v.id === videoId);

  const toggleShortsAutoplay = () => {
    setIsShortsAutoplayEnabled(prev => !prev);
  };

  const toggleLiteMode = useCallback(() => {
      // 1. Calculate next state
      const nextState = !isLiteMode;
      
      // 2. Set React State
      setIsLiteMode(nextState);
      
      // 3. Persist IMMEDIATELY to localStorage to avoid race conditions with reload
      localStorage.setItem('isLiteMode', String(nextState));
      
      // 4. Reload page to apply changes (Lite Mode uses a different root structure)
      // Small delay allows the UI to register the click visually before reload
      setTimeout(() => window.location.reload(), 50);
  }, [isLiteMode]);

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

  const exportUserData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      version: '3.1',
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
    a.download = `xeroxyt_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importUserData = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (!json.subscriptions || !json.history) throw new Error('Invalid backup file');
          
          localStorage.setItem('subscribedChannels', JSON.stringify(json.subscriptions));
          localStorage.setItem('videoHistory', JSON.stringify(json.history));
          localStorage.setItem('playlists', JSON.stringify(json.playlists || []));
          
          if (json.preferences) {
            const p = json.preferences;
            localStorage.setItem('ngKeywords', JSON.stringify(p.ngKeywords || []));
            localStorage.setItem('ngChannels', JSON.stringify(p.ngChannels || []));
            const hidden = Array.isArray(p.hiddenVideos) && p.hiddenVideos.every((item: any) => typeof item === 'object') 
                ? p.hiddenVideos 
                : [];
            localStorage.setItem('hiddenVideos', JSON.stringify(hidden));
            localStorage.setItem('isShortsAutoplayEnabled', String(p.isShortsAutoplayEnabled ?? true));
            if(p.isLiteMode !== undefined) localStorage.setItem('isLiteMode', String(p.isLiteMode));
            if(p.defaultPlayerMode) localStorage.setItem('defaultPlayerMode', p.defaultPlayerMode);
          }

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

  return (
    <PreferenceContext.Provider value={{
      ngKeywords, ngChannels, hiddenVideos, negativeKeywords, isShortsAutoplayEnabled,
      isLiteMode, toggleLiteMode,
      defaultPlayerMode, setDefaultPlayerMode,
      checkAppVersion,
      addNgKeyword, removeNgKeyword, addNgChannel, removeNgChannel, isNgChannel,
      addHiddenVideo, unhideVideo, isvideoHidden, removeNegativeProfileForVideos,
      toggleShortsAutoplay, exportUserData, importUserData
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
