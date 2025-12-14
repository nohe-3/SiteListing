import React, { useState, useEffect, useCallback } from 'react';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getChannelVideos } from '../utils/api';
import type { Video } from '../types';
import VideoGrid from '../components/VideoGrid';
import VideoCardSkeleton from '../components/icons/VideoCardSkeleton';

// Parse "1 hour ago", "1 day ago" etc to comparable value
const parseRelativeTime = (timeStr: string): number => {
    if (!timeStr) return 0;
    const now = new Date().getTime();
    
    // Japanese format handling (e.g., "1時間前", "2日前")
    if (timeStr.includes('前')) {
        const num = parseInt(timeStr.match(/\d+/)?.[0] || '0', 10);
        if (timeStr.includes('秒')) return now - num * 1000;
        if (timeStr.includes('分')) return now - num * 60 * 1000;
        if (timeStr.includes('時間')) return now - num * 60 * 60 * 1000;
        if (timeStr.includes('日')) return now - num * 24 * 60 * 60 * 1000;
        if (timeStr.includes('週間')) return now - num * 7 * 24 * 60 * 60 * 1000;
        if (timeStr.includes('ヶ月') || timeStr.includes('か月')) return now - num * 30 * 24 * 60 * 60 * 1000;
        if (timeStr.includes('年')) return now - num * 365 * 24 * 60 * 60 * 1000;
    }

    // English format handling (fallback)
    if (timeStr.includes('ago')) {
        const num = parseInt(timeStr.match(/\d+/)?.[0] || '0', 10);
        if (timeStr.includes('second')) return now - num * 1000;
        if (timeStr.includes('minute')) return now - num * 60 * 1000;
        if (timeStr.includes('hour')) return now - num * 60 * 60 * 1000;
        if (timeStr.includes('day')) return now - num * 24 * 60 * 60 * 1000;
        if (timeStr.includes('week')) return now - num * 7 * 24 * 60 * 60 * 1000;
        if (timeStr.includes('month')) return now - num * 30 * 24 * 60 * 60 * 1000;
        if (timeStr.includes('year')) return now - num * 365 * 24 * 60 * 60 * 1000;
    }
    
    return 0;
};

const SubscriptionsPage: React.FC = () => {
    const { subscribedChannels } = useSubscription();
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string>('all');

    const fetchSubscriptionFeed = useCallback(async () => {
        if (subscribedChannels.length === 0) {
            setIsLoading(false);
            setVideos([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideos([]);

        try {
            let fetchedVideos: Video[] = [];
            if (selectedChannelId === 'all') {
                const channelPromises = subscribedChannels.slice(0, 15).map(channel => 
                    getChannelVideos(channel.id).then(res => 
                        res.videos.slice(0, 5).map(video => ({
                            ...video,
                            channelName: channel.name,
                            channelAvatarUrl: channel.avatarUrl,
                            channelId: channel.id
                        }))
                    )
                );
                const results = await Promise.all(channelPromises);
                fetchedVideos = results.flat();
            } else {
                const result = await getChannelVideos(selectedChannelId);
                const channel = subscribedChannels.find(c => c.id === selectedChannelId);
                if (channel) {
                     fetchedVideos = result.videos.map(video => ({
                        ...video,
                        channelName: channel.name,
                        channelAvatarUrl: channel.avatarUrl,
                        channelId: channel.id
                    }));
                } else {
                    fetchedVideos = result.videos;
                }
            }
            
            const uniqueVideos = Array.from(new Map(fetchedVideos.map(v => [v.id, v])).values());
            
            // Sort by latest (Newest first)
            uniqueVideos.sort((a, b) => parseRelativeTime(b.uploadedAt) - parseRelativeTime(a.uploadedAt));
            
            setVideos(uniqueVideos);

        } catch (err: any) {
            setError(err.message || '登録チャンネルの動画の読み込みに失敗しました。');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [subscribedChannels, selectedChannelId]);

    useEffect(() => {
        fetchSubscriptionFeed();
    }, [fetchSubscriptionFeed]);

    if (error) {
        return <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">{error}</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">登録チャンネル</h1>

            {subscribedChannels.length > 0 && (
                <div className="mb-6 border-b border-yt-spec-light-20 dark:border-yt-spec-20 overflow-hidden">
                    <div className="flex items-center space-x-3 overflow-x-auto pb-2 no-scrollbar px-1">
                        <button 
                            onClick={() => setSelectedChannelId('all')}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${selectedChannelId === 'all' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-yt-light dark:bg-yt-dark-gray text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            すべて
                        </button>
                        {subscribedChannels.map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setSelectedChannelId(channel.id)}
                                className={`flex-shrink-0 flex items-center p-2 rounded-lg whitespace-nowrap transition-colors border border-transparent ${selectedChannelId === channel.id ? 'bg-yt-spec-light-10 dark:bg-yt-spec-10 border-yt-spec-light-20' : 'hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'}`}
                            >
                                <img src={channel.avatarUrl} alt={channel.name} className="w-6 h-6 rounded-full" />
                                <span className="ml-2 text-sm font-medium hidden sm:block text-black dark:text-white">{channel.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {isLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                    {Array.from({ length: 10 }).map((_, index) => <VideoCardSkeleton key={index} />)}
                </div>
            ) : subscribedChannels.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-yt-light-gray mb-4">登録しているチャンネルはありません。</p>
                    <Link to="/" className="bg-yt-blue text-white font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
                        動画を探す
                    </Link>
                </div>
            ) : videos.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-yt-light-gray">このチャンネルからの新しい動画はありません。</p>
                </div>
            ) : (
                <VideoGrid videos={videos} isLoading={false} />
            )}
        </div>
    );
};

export default SubscriptionsPage;