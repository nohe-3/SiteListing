
import React, { createContext, useState, useContext, ReactNode, useRef, useMemo, useCallback } from 'react';
import { useHistory } from './HistoryContext';
import { useSubscription } from './SubscriptionContext';
import { buildUserProfile, inferTopInterests } from '../utils/xrai';
import type { Video } from '../types';

type WebLLMModule = typeof import("@mlc-ai/web-llm");

const SELECTED_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC"; 

interface AiContextType {
  isLoaded: boolean;
  isLoading: boolean;
  loadProgress: string;
  initializeEngine: () => Promise<void>;
  getAiRecommendations: () => Promise<string[]>;
  summarizeComments: (comments: string[]) => Promise<string>;
  discoveryVideoCache: React.MutableRefObject<Video[]>;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

export const AiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState('');
  
  const engine = useRef<any>(null);
  const webllmRef = useRef<WebLLMModule | null>(null);
  const discoveryVideoCache = useRef<Video[]>([]); // Cache for discovered videos to prevent reload flickering

  const { history } = useHistory();
  const { subscribedChannels } = useSubscription();

  const initializeEngine = useCallback(async () => {
    if (engine.current || isLoading) return;
    
    setIsLoading(true);
    setLoadProgress('AIモジュールを読み込み中...');

    try {
      if (!webllmRef.current) {
        webllmRef.current = await import("@mlc-ai/web-llm");
      }
      const webllm = webllmRef.current;
      
      setLoadProgress('エンジンの初期化中...');

      const initProgressCallback = (report: { text: string }) => {
        setLoadProgress(report.text);
      };

      const appConfig = {
        ...webllm.prebuiltAppConfig,
        useIndexedDBCache: true,
      };

      const newEngine = await webllm.CreateMLCEngine(
        SELECTED_MODEL,
        { 
            initProgressCallback: initProgressCallback,
            appConfig: appConfig
        }
      );

      engine.current = newEngine;
      setIsLoaded(true);

    } catch (error) {
      console.error("Failed to load WebLLM:", error);
      setLoadProgress('AIエンジンのロードに失敗しました。WebGPU対応ブラウザか確認してください。');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);
  
  // Generates search queries based on user profile (Analysis Only)
  const getAiRecommendations = useCallback(async (): Promise<string[]> => {
    if (!engine.current) {
        await initializeEngine();
    }
    if (!engine.current) return [];

    const profile = buildUserProfile({
        watchHistory: history,
        searchHistory: [],
        subscribedChannels: subscribedChannels
    });
    const interests = inferTopInterests(profile, 15);
    const recentTitles = history.slice(0, 5).map(v => v.title).join('", "');
    
    // Prompt engineering for "YouTube-like" discovery (New Channels, Adjacent Genres)
    const prompt = `
    You are a YouTube recommendation AI.
    User's watch history: ["${recentTitles}"].
    Core interests: [${interests.join(', ')}].

    Task:
    1. Extract important keywords from history.
    2. Think of "Adjacent" or "Similar" topics that are interesting but not exactly the same (Discovery).
    3. Generate 5 search queries using the "OR" operator to combine related terms for broader discovery (e.g., "Indie Games OR Retro RPG", "Lo-Fi OR Jazz Study").

    Output ONLY the 5 queries, one per line. No numbering.
    `;

    try {
        const reply = await engine.current.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8, // Higher temperature for more diversity
            max_tokens: 150,
        });
        
        const content = reply.choices[0].message.content || '';
        // Split by newlines and clean up
        const queries = content.split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').replace(/^- \s*/, '').replace(/"/g, '').trim())
            .filter(line => line.length > 0);
            
        return queries.slice(0, 5);
    } catch (e) {
        console.error("Recommendation generation failed", e);
        return interests.slice(0, 5);
    }
  }, [history, subscribedChannels, initializeEngine]);

  // Summarize comments using Local LLM
  const summarizeComments = useCallback(async (comments: string[]): Promise<string> => {
    if (!engine.current) {
        await initializeEngine();
    }
    if (!engine.current) return "エンジンの読み込みに失敗しました。";

    // Limit input to avoid context overflow (top 30 comments usually capture the vibe)
    const commentsText = comments.slice(0, 30).join('\n');

    const prompt = `
    あなたはYouTube動画のコメント分析AIです。
    以下の視聴者コメントを読み、動画に対する主な反応や意見、議論の論点を日本語で要約してください。
    
    出力形式:
    - 箇条書きで3〜5点
    - 簡潔な日本語で
    - 感情的な傾向（ポジティブ/ネガティブ/議論中など）も含める

    コメントリスト:
    ${commentsText}
    `;

    try {
        const reply = await engine.current.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6, 
            max_tokens: 300,
        });
        
        return reply.choices[0].message.content || '要約を生成できませんでした。';
    } catch (e) {
        console.error("Comment summarization failed", e);
        return "エラーが発生しました。もう一度お試しください。";
    }
  }, [initializeEngine]);

  const value = useMemo(() => ({
    isLoaded, 
    isLoading, 
    loadProgress, 
    initializeEngine, 
    getAiRecommendations,
    summarizeComments,
    discoveryVideoCache
  }), [isLoaded, isLoading, loadProgress, initializeEngine, getAiRecommendations, summarizeComments]);

  return (
    <AiContext.Provider value={value}>
      {children}
    </AiContext.Provider>
  );
};

export const useAi = (): AiContextType => {
  const context = useContext(AiContext);
  if (context === undefined) {
    throw new Error('useAi must be used within an AiProvider');
  }
  return context;
};
