
import type { Video, Channel } from '../types';

// --- Types ---

export interface UserProfile {
  keywords: Map<string, number>;
  magnitude: number;
}

interface UserSources {
  watchHistory: Video[];
  shortsHistory?: Video[];
  searchHistory: string[];
  subscribedChannels: Channel[];
}

// --- Keyword Extraction ---

const JAPANESE_STOP_WORDS = new Set([
  'の', 'に', 'は', 'を', 'が', 'で', 'です', 'ます', 'こと', 'もの', 'これ', 'それ', 'あれ',
  'いる', 'する', 'ある', 'ない', 'から', 'まで', 'と', 'も', 'や', 'など', 'さん', 'ちゃん',
  'about', 'and', 'the', 'to', 'a', 'of', 'in', 'for', 'on', 'with', 'as', 'at', 'movie', 'video',
  'official', 'channel', 'music', 'mv', 'pv', 'tv', 'shorts', 'part', 'vol', 'no', 'ep'
]);

const segmenter = (typeof Intl !== 'undefined' && (Intl as any).Segmenter) 
    ? new (Intl as any).Segmenter('ja', { granularity: 'word' }) 
    : null;

export const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  const cleanedText = text.toLowerCase();
  let words: string[] = [];

  if (segmenter) {
      const segments = segmenter.segment(cleanedText);
      for (const segment of segments) {
          if (segment.isWordLike) words.push(segment.segment);
      }
  } else {
      words = cleanedText.replace(/[\p{S}\p{P}\p{Z}\p{C}]/gu, ' ').split(/\s+/).filter(w => w.length > 0);
  }

  return Array.from(new Set(words.filter(word => {
    if (word.length <= 1 && !/^[a-zA-Z0-9]$/.test(word)) return false;
    if (JAPANESE_STOP_WORDS.has(word)) return false;
    if (/^\d+$/.test(word)) return false; 
    return true;
  })));
};

export const calculateMagnitude = (vector: Map<string, number>): number => {
    let sumSq = 0;
    for (const val of vector.values()) sumSq += val * val;
    return Math.sqrt(sumSq);
};

export const isJapaneseText = (text: string): boolean => {
    // Hiragana, Katakana, Kanji, Zenkaku punctuation/numbers, CJK Unified Ideographs
    // This regex checks if the string contains ANY Japanese-specific characters.
    const jpRegex = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;
    return jpRegex.test(text);
};

// --- User Profile Construction ---

export const buildUserProfile = (sources: UserSources): UserProfile => {
  const keywords = new Map<string, number>();

  const addKeywords = (text: string, weight: number) => {
    extractKeywords(text).forEach(kw => {
      keywords.set(kw, (keywords.get(kw) || 0) + weight);
    });
  };

  // Recent searches have high intent
  sources.searchHistory.slice(0, 30).forEach((term, index) => {
    addKeywords(term, 8.0 * Math.exp(-index / 10)); 
  });

  // Watch history (Implicit feedback)
  sources.watchHistory.slice(0, 50).forEach((video, index) => {
    const recencyWeight = 5.0 * Math.exp(-index / 15);
    addKeywords(video.title, recencyWeight);
    addKeywords(video.channelName, recencyWeight * 1.5);
  });

  // Shorts history (Implicit feedback - slightly lower weight than long-form)
  if (sources.shortsHistory) {
    sources.shortsHistory.slice(0, 30).forEach((video, index) => {
        const recencyWeight = 3.5 * Math.exp(-index / 15);
        addKeywords(video.title, recencyWeight);
        addKeywords(video.channelName, recencyWeight * 1.5);
    });
  }

  // Subscriptions (Explicit feedback)
  sources.subscribedChannels.forEach(channel => {
    addKeywords(channel.name, 3.0);
  });
  
  return { keywords, magnitude: calculateMagnitude(keywords) };
};

export const inferTopInterests = (profile: UserProfile, limit: number = 6): string[] => {
    return [...profile.keywords.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0])
        .slice(0, limit);
};
