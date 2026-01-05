
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import type { Video } from '../types';
import { usePreference } from './PreferenceContext';

interface HistoryContextType {
  history: Video[];
  shortsHistory: Video[];
  addVideoToHistory: (video: Video) => void;
  addShortToHistory: (video: Video) => void;
  clearHistory: () => void;
  removeVideosFromHistory: (videoIds: string[]) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

const HISTORY_KEY = 'videoHistory';
const SHORTS_HISTORY_KEY = 'shortsHistory';
const MAX_HISTORY_LENGTH = 200;

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { notifyAction, isGuestMode } = usePreference();
  const isInitialized = useRef(false);

  const [history, setHistory] = useState<Video[]>([]);
  const [shortsHistory, setShortsHistory] = useState<Video[]>([]);

  // Initial Read
  useEffect(() => {
      try {
          const item = window.localStorage.getItem(HISTORY_KEY);
          if (item) setHistory(JSON.parse(item));
          
          const shortsItem = window.localStorage.getItem(SHORTS_HISTORY_KEY);
          if (shortsItem) setShortsHistory(JSON.parse(shortsItem));
      } catch (error) {
          console.error("Failed to parse history from localStorage", error);
      } finally {
          isInitialized.current = true;
      }
  }, []);

  // Sync Write
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [history]);

  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      window.localStorage.setItem(SHORTS_HISTORY_KEY, JSON.stringify(shortsHistory));
    } catch (error) {
      console.error("Failed to save shorts history to localStorage", error);
    }
  }, [shortsHistory]);

  const addVideoToHistory = useCallback((video: Video) => {
    if (isGuestMode) return; 

    setHistory(prev => {
      const newHistory = [video, ...prev.filter(v => v.id !== video.id)];
      return newHistory.slice(0, MAX_HISTORY_LENGTH);
    });
    notifyAction();
  }, [notifyAction, isGuestMode]);

  const addShortToHistory = useCallback((video: Video) => {
    if (isGuestMode) return;

    setShortsHistory(prev => {
      const newHistory = [video, ...prev.filter(v => v.id !== video.id)];
      return newHistory.slice(0, MAX_HISTORY_LENGTH);
    });
    notifyAction();
  }, [notifyAction, isGuestMode]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setShortsHistory([]);
    notifyAction();
  }, [notifyAction]);

  const removeVideosFromHistory = useCallback((videoIds: string[]) => {
    setHistory(prev => prev.filter(video => !videoIds.includes(video.id)));
    setShortsHistory(prev => prev.filter(video => !videoIds.includes(video.id)));
    notifyAction();
  }, [notifyAction]);

  return (
    <HistoryContext.Provider value={{ history, shortsHistory, addVideoToHistory, addShortToHistory, clearHistory, removeVideosFromHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
