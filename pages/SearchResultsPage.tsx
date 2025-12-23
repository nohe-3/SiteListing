import React, { useState, useEffect, useCallback } from 'react';
// FIX: Use named import for useSearchParams from react-router-dom
import { useSearchParams } from 'react-router-dom';
import { searchVideos, parseDuration } from '../utils/api';
import type { Video, Channel, ApiPlaylist } from '../types';
import SearchVideoResultCard from '../components/SearchVideoResultCard';
import SearchChannelResultCard from '../components/SearchChannelResultCard';
import SearchPlaylistResultCard from '../components/SearchPlaylistResultCard';
import ShortsShelf from '../components/ShortsShelf';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { usePreference } from '../contexts/PreferenceContext';

const SearchResultsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('search_query');
    const { ngKeywords, ngChannels } = usePreference();
    
    const [videos, setVideos] = useState<Video[]>([]);
    const [shorts, setShorts] = useState<Video[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const isContentAllowed = useCallback((item: Video | Channel | ApiPlaylist) => {
        const lowerQuery = (text: string) => text.toLowerCase();
        
        let channelId = '';
        if ('channelId' in item) channelId = item.channelId;
        else if ('id' in item && 'subscriberCount' in item) channelId = item.id;
        
        if (channelId && ngChannels.some(c => c.id === channelId)) {
            return false;
        }

        let textToScan = '';
        if ('title' in item) textToScan += item.title + ' ';
        if ('descriptionSnippet' in item) textToScan += (item.descriptionSnippet || '') + ' ';
        if ('channelName' in item) textToScan += (item.channelName || '') + ' ';
        if ('name' in item) textToScan += (item.name || '') + ' ';
        
        const scannedText = lowerQuery(textToScan);
        if (ngKeywords.some(keyword => scannedText.includes(lowerQuery(keyword)))) {
            return false;
        }

        return true;
    }, [ngChannels, ngKeywords]);

    const performSearch = useCallback(async (searchQuery: string, pageToken: string = '1') => {
        if (!searchQuery) return;
        
        if (pageToken === '1') {
            setError(null);
            setIsLoading(true);
        } else {
            setIsFetchingMore(true);
        }
        
        try {
            const results = await searchVideos(searchQuery, pageToken);
            
            const separatedShorts: Video[] = [];
            const separatedVideos: Video[] = [];

            results.videos.forEach(v => {
                 const sec = parseDuration(v.isoDuration, v.duration);
                 const isShort = (sec > 0 && sec <= 60) || v.title.toLowerCase().includes('#shorts');
                 if (isShort) separatedShorts.push(v);
                 else separatedVideos.push(v);
            });

            const filteredVideos = separatedVideos.filter(isContentAllowed);
            const allShorts = [...results.shorts, ...separatedShorts];
            const filteredShorts = allShorts.filter(isContentAllowed);
            const filteredChannels = results.channels.filter(isContentAllowed);
            const filteredPlaylists = results.playlists.filter(isContentAllowed);

            if (pageToken === '1') {
                setVideos(filteredVideos);
                setShorts(filteredShorts);
                setChannels(filteredChannels);
                setPlaylists(filteredPlaylists);
            } else {
                setVideos(prev => [...prev, ...filteredVideos]);
                setShorts(prev => [...prev, ...filteredShorts]);
            }
            setNextPageToken(results.nextPageToken);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [isContentAllowed]);

    useEffect(() => {
        setVideos([]);
        setShorts([]);
        setChannels([]);
        setPlaylists([]);
        setNextPageToken(undefined);
        if (query) performSearch(query, '1');
        else setIsLoading(false);
    }, [query, performSearch]);

    const handleLoadMore = () => {
        if (query && nextPageToken && !isFetchingMore) {
            performSearch(query, nextPageToken);
        }
    };

    const lastElementRef = useInfiniteScroll(handleLoadMore, !!nextPageToken, isFetchingMore || isLoading);

    if (isLoading) {
        return (
             <div className="flex flex-col space-y-6 max-w-6xl mx-auto p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                   <div key={index} className="flex flex-col sm:flex-row gap-4 animate-pulse">
                        <div className="w-full sm:w-[360px] aspect-video bg-yt-light dark:bg-yt-dark-gray rounded-xl"></div>
                        <div className="flex-1 space-y-3 py-2">
                            <div className="h-5 bg-yt-light dark:bg-yt-dark-gray rounded w-3/4"></div>
                            <div className="h-4 bg-yt-light dark:bg-yt-dark-gray rounded w-1/3"></div>
                            <div className="h-8 w-8 rounded-full bg-yt-light dark:bg-yt-dark-gray"></div>
                        </div>
                   </div>
                ))}
            </div>
        );
    }
    
    if (error && videos.length === 0) {
        return <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">{error}</div>;
    }

    if (videos.length === 0 && channels.length === 0 && playlists.length === 0 && shorts.length === 0 && query) {
        return <div className="text-center mt-10">「{query}」の検索結果はありません。<br/><span className="text-xs text-yt-light-gray">※NG設定により非表示になっている可能性があります</span></div>
    }

    return (
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
            {channels.length > 0 && (
                <div className="mb-6 space-y-4">
                    {channels.map(channel => (
                        <SearchChannelResultCard key={channel.id} channel={channel} />
                    ))}
                </div>
            )}

            {shorts.length > 0 && (
                <div className="mb-8 border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-8">
                    <ShortsShelf shorts={shorts} isLoading={false} />
                </div>
            )}
            
            {playlists.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4">プレイリスト</h2>
                    <div className="space-y-4">
                        {playlists.map(playlist => (
                            <SearchPlaylistResultCard key={playlist.id} playlist={playlist} />
                        ))}
                    </div>
                     <hr className="my-6 border-yt-spec-light-20 dark:border-yt-spec-20" />
                </div>
            )}

            {videos.length > 0 && (
              <div className="flex flex-col space-y-2">
                  <h2 className="text-xl font-bold mb-2">動画</h2>
                  {videos.map((video, index) => (
                      <SearchVideoResultCard key={`${video.id}-${index}`} video={video} />
                  ))}
              </div>
            )}

            {nextPageToken && (
                <div ref={lastElementRef} className="flex justify-center mt-8 mb-10 h-10">
                    {isFetchingMore && <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yt-blue"></div>}
                </div>
            )}
        </div>
    );
};

export default SearchResultsPage;