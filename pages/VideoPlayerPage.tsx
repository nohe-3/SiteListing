
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// FIX: Use named imports for react-router-dom components and hooks.
import { useParams, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getVideoDetails, getPlayerConfig, getComments, getVideosByIds, getExternalRelatedVideos, getRawStreamData } from '../utils/api';
import type { VideoDetails, Video, Comment, Channel, CommentResponse } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useHistory } from '../contexts/HistoryContext';
import { usePlaylist } from '../contexts/PlaylistContext';
import { usePreference } from '../contexts/PreferenceContext';
import VideoPlayerPageSkeleton from '../components/skeletons/VideoPlayerPageSkeleton';
import PlaylistModal from '../components/PlaylistModal';
import DownloadModal from '../components/DownloadModal';
import CommentComponent from '../components/Comment';
import PlaylistPanel from '../components/PlaylistPanel';
import RelatedVideoCard from '../components/RelatedVideoCard';
import { LikeIcon, SaveIcon, DownloadIcon, DislikeIcon, ChevronRightIcon, TuneIcon, SpeedIcon, ChatIcon } from '../components/icons/Icons';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

const VideoPlayerPage: React.FC = () => {
    const { videoId } = useParams<{ videoId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const playlistId = searchParams.get('list');

    // Get pre-loaded video data from navigation state if available
    const initialVideo = location.state?.video as Video | undefined;

    const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(() => {
        if (initialVideo && initialVideo.id === videoId) {
            return {
                ...initialVideo,
                description: '',
                likes: '',
                dislikes: '',
                channel: {
                    id: initialVideo.channelId,
                    name: initialVideo.channelName,
                    avatarUrl: initialVideo.channelAvatarUrl,
                    subscriberCount: ''
                },
                relatedVideos: [],
                isLive: initialVideo.isLive || false
            } as VideoDetails;
        }
        return null;
    });

    const [comments, setComments] = useState<Comment[]>([]);
    const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
    
    // If we have initial data, don't show full loading skeleton immediately
    const [isLoading, setIsLoading] = useState(!videoDetails);
    
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [playlistVideos, setPlaylistVideos] = useState<Video[]>([]);
    const [isCollaboratorMenuOpen, setIsCollaboratorMenuOpen] = useState(false);
    const collaboratorMenuRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    // Comments Pagination
    const [commentsContinuation, setCommentsContinuation] = useState<string | undefined>(undefined);
    const [isFetchingMoreComments, setIsFetchingMoreComments] = useState(false);
    
    // Playback Controls
    const [isControlsOpen, setIsControlsOpen] = useState(false);
    const controlsRef = useRef<HTMLDivElement>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [transposeLevel, setTransposeLevel] = useState(0); 
    const [preservesPitch, setPreservesPitch] = useState(true);
    
    // Live Chat State
    const [showLiveChat, setShowLiveChat] = useState(false);
    
    // Comment Sort State
    const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');
    
    // State for player params string instead of YT.Player object
    const [playerParams, setPlayerParams] = useState<string>('');

    const [isShuffle, setIsShuffle] = useState(searchParams.get('shuffle') === '1');
    const [isLoop, setIsLoop] = useState(searchParams.get('loop') === '1');

    // Stable shuffle state
    const [shuffledVideos, setShuffledVideos] = useState<Video[]>([]);
    const shuffleSeedRef = useRef<string | null>(null);

    // Streaming State
    const { defaultPlayerMode, setDefaultPlayerMode } = usePreference();
    const [streamData, setStreamData] = useState<any>(null);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isStreamDataLoading, setIsStreamDataLoading] = useState(false);
    
    const streamVideoRef = useRef<HTMLVideoElement>(null);

    const { isSubscribed, subscribe, unsubscribe } = useSubscription();
    const { addVideoToHistory } = useHistory();
    const { playlists, reorderVideosInPlaylist } = usePlaylist();

    const currentPlaylist = useMemo(() => {
        if (!playlistId) return null;
        return playlists.find(p => p.id === playlistId) || null;
    }, [playlistId, playlists]);

    useEffect(() => {
        setIsShuffle(searchParams.get('shuffle') === '1');
        setIsLoop(searchParams.get('loop') === '1');
    }, [searchParams]);
    
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const paramsString = await getPlayerConfig();
                const params = new URLSearchParams(paramsString);
                // Ensure autoplay is enabled
                params.set('autoplay', '1');
                setPlayerParams(params.toString());
            } catch (error) {
                console.error("Failed to fetch player config, using defaults", error);
                setPlayerParams('autoplay=1&rel=0');
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (collaboratorMenuRef.current && !collaboratorMenuRef.current.contains(event.target as Node)) {
                setIsCollaboratorMenuOpen(false);
            }
            if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
                setIsControlsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Listen to IFrame messages for Playlist Navigation Sync
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Check origin to ensure safety (optional but recommended if you know specific origins)
            // YouTube iframe API often posts from https://www.youtube.com or similar
            if (event.origin !== "https://www.youtube.com" && event.origin !== "https://www.youtubeeducation.com") return;

            try {
                const data = JSON.parse(event.data);
                // The 'infoDelivery' event contains updated video data when the player moves to a new video
                if (data.event === 'infoDelivery' && data.info?.videoData?.videoId) {
                    const newId = data.info.videoData.videoId;
                    if (newId && newId !== videoId) {
                        // Construct new URL preserving query params (like list, shuffle, loop)
                        // This allows the React app to catch up with the Iframe's internal playlist navigation
                        const newParams = new URLSearchParams(searchParams);
                        navigate(`/watch/${newId}?${newParams.toString()}`, { replace: true });
                    }
                }
            } catch (e) {
                // Ignore parsing errors for other message types
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [videoId, searchParams, navigate]);

    useEffect(() => {
        const fetchPlaylistVideos = async () => {
            if (currentPlaylist) {
                if (currentPlaylist.videoIds.length > 0) {
                    const fetchedVideos = await getVideosByIds(currentPlaylist.videoIds);
                    const videoMap = new Map(fetchedVideos.map(v => [v.id, v]));
                    const orderedVideos = currentPlaylist.videoIds.map(id => videoMap.get(id)).filter((v): v is Video => !!v);
                    setPlaylistVideos(orderedVideos);
                } else {
                    setPlaylistVideos([]);
                }
            } else {
                 setPlaylistVideos([]);
            }
        };
        fetchPlaylistVideos();
    }, [currentPlaylist]);

    // Stable Shuffle Logic
    useEffect(() => {
        if (!isShuffle || !playlistId) {
            setShuffledVideos([]);
            shuffleSeedRef.current = null;
            return;
        }
        if (shuffleSeedRef.current === playlistId && shuffledVideos.length > 0) {
            return;
        }
        if (playlistVideos.length > 0) {
            const currentIndex = playlistVideos.findIndex(v => v.id === videoId);
            const newOrder = [...playlistVideos];
            if (currentIndex !== -1) {
                const current = newOrder[currentIndex];
                newOrder.splice(currentIndex, 1);
                newOrder.sort(() => Math.random() - 0.5);
                newOrder.unshift(current);
            } else {
                 newOrder.sort(() => Math.random() - 0.5);
            }
            setShuffledVideos(newOrder);
            shuffleSeedRef.current = playlistId;
        }
    }, [isShuffle, playlistVideos, videoId, playlistId, shuffledVideos.length]);

    const fetchStreamDataIfNeeded = useCallback(async () => {
        if (streamData || !videoId || isStreamDataLoading) return;
        setIsStreamDataLoading(true);
        try {
            const data = await getRawStreamData(videoId);
            setStreamData(data);
        } catch (e) {
            console.error("Failed to fetch stream data", e);
        } finally {
            setIsStreamDataLoading(false);
        }
    }, [videoId, streamData, isStreamDataLoading]);

    useEffect(() => {
        if (defaultPlayerMode === 'stream') {
            fetchStreamDataIfNeeded();
        }
    }, [defaultPlayerMode, fetchStreamDataIfNeeded]);

    useEffect(() => {
        let isMounted = true;
        const fetchVideoData = async () => {
            if (!videoId) return;
            if (isMounted) {
                // Only show loading if we don't have initial data to display
                if (!initialVideo || initialVideo.id !== videoId) {
                    setIsLoading(true);
                    setVideoDetails(null);
                }
                setError(null);
                setComments([]);
                setCommentsContinuation(undefined);
                setRelatedVideos([]);
                setStreamData(null);
                setIsDownloadModalOpen(false);
                setIsCommentsLoading(true);
                setShowLiveChat(false); 
                setPlaybackSpeed(1.0);
                setTransposeLevel(0);
                setCommentSort('top'); 
                window.scrollTo(0, 0);
            }

            getVideoDetails(videoId)
                .then(details => {
                    if (isMounted) {
                        // Merge logic: If API returns vague views, prefer the initial detailed view count
                        if (initialVideo && initialVideo.views && (details.views === '0回視聴' || details.views === '視聴回数不明' || details.views === '0回' || details.views.startsWith('0'))) {
                             details.views = initialVideo.views;
                        }

                        setVideoDetails(details);
                        if(details.isLive) setShowLiveChat(true); 
                        
                        if (details.relatedVideos && details.relatedVideos.length > 0) {
                            setRelatedVideos(details.relatedVideos);
                        }
                        addVideoToHistory(details);
                        setIsLoading(false);
                    }
                })
                .catch(err => {
                    if (isMounted) {
                        // If we have initial data, show that instead of error initially, maybe show toast
                        if (!videoDetails) {
                            setError(err.message || '動画の読み込みに失敗しました。');
                        }
                        setIsLoading(false);
                    }
                });

            // Comments fetch with auto-pagination for at least 50 comments
            const loadComments = async () => {
                try {
                    let accComments: Comment[] = [];
                    let token: string | undefined = undefined;
                    
                    // First page
                    const res1 = await getComments(videoId, 'top');
                    accComments = res1.comments;
                    token = res1.continuation;

                    // Fetch more if needed and available (Target: 50 items)
                    while (accComments.length < 50 && token && isMounted) {
                        const resNext: CommentResponse = await getComments(videoId, 'top', token);
                        if (!resNext.comments || resNext.comments.length === 0) break;
                        accComments = [...accComments, ...resNext.comments];
                        token = resNext.continuation;
                    }

                    if (isMounted) {
                        setComments(accComments);
                        setCommentsContinuation(token);
                    }
                } catch (err) {
                    console.warn("Failed to fetch comments", err);
                } finally {
                    if (isMounted) setIsCommentsLoading(false);
                }
            };
            
            loadComments();

            getExternalRelatedVideos(videoId)
                .then(externalRelated => {
                    if (isMounted && externalRelated && externalRelated.length > 0) {
                        // Append or replace if main API failed
                        setRelatedVideos(prev => prev.length > 0 ? prev : externalRelated);
                    }
                })
                .catch(extErr => console.warn("Failed to fetch external related videos", extErr));
        };
        fetchVideoData();
        return () => { isMounted = false; };
    }, [videoId, addVideoToHistory]); // Remove initialVideo from deps to prevent re-fetching on nav state change
    
    // Comments Infinite Scroll
    const fetchMoreComments = useCallback(async () => {
        if (!videoId || !commentsContinuation || isFetchingMoreComments) return;
        setIsFetchingMoreComments(true);
        try {
            const res = await getComments(videoId, commentSort, commentsContinuation);
            setComments(prev => [...prev, ...res.comments]);
            setCommentsContinuation(res.continuation);
        } catch (e) {
            console.error("Failed to load more comments", e);
        } finally {
            setIsFetchingMoreComments(false);
        }
    }, [videoId, commentsContinuation, isFetchingMoreComments, commentSort]);

    const commentsLoaderRef = useInfiniteScroll(fetchMoreComments, !!commentsContinuation, isFetchingMoreComments);

    // Handle Comment Sort Change
    const handleCommentSortChange = (newSort: 'top' | 'newest') => {
        if (newSort === commentSort || !videoId) return;
        setCommentSort(newSort);
        setIsCommentsLoading(true);
        setComments([]);
        setCommentsContinuation(undefined);
        getComments(videoId, newSort)
            .then(res => {
                setComments(res.comments);
                setCommentsContinuation(res.continuation);
            })
            .catch(e => console.error(e))
            .finally(() => setIsCommentsLoading(false));
    };

    const navigateToNextVideo = useCallback(() => {
        if (!currentPlaylist || playlistVideos.length === 0) return;
        const currentList = isShuffle ? shuffledVideos : playlistVideos;
        if (currentList.length === 0) return;
        const currentIndex = currentList.findIndex(v => v.id === videoId);
        let nextIndex = currentIndex !== -1 ? currentIndex + 1 : 0;
        if (nextIndex >= currentList.length) {
            if (isLoop) nextIndex = 0; else return;
        }
        const nextVideo = currentList[nextIndex];
        if (nextVideo) {
             const newParams = new URLSearchParams(searchParams);
             if (isShuffle) newParams.set('shuffle', '1');
             if (isLoop) newParams.set('loop', '1');
             navigate(`/watch/${nextVideo.id}?${newParams.toString()}`);
        }
    }, [currentPlaylist, playlistVideos, isShuffle, shuffledVideos, videoId, isLoop, navigate, searchParams]);

    const iframeSrc = useMemo(() => {
        if (!videoDetails?.id || !playerParams) return '';
        
        let src = `https://www.youtubeeducation.com/embed/${videoDetails.id}`;
        let params = playerParams.startsWith('?') ? playerParams.substring(1) : playerParams;
        if (!params.includes('enablejsapi')) params += '&enablejsapi=1';
        if (!params.includes('origin')) params += `&origin=${encodeURIComponent(window.location.origin)}`;
        if (!params.includes('autoplay')) params += '&autoplay=1';

        // --- Playlist Auto-play Logic (Native Iframe) ---
        const activeList = isShuffle ? shuffledVideos : playlistVideos;
        
        if (activeList.length > 0) {
            const currentIndex = activeList.findIndex(v => v.id === videoId);
            if (currentIndex !== -1) {
                // Construct the queue: Videos coming AFTER the current one
                const nextVideos = activeList.slice(currentIndex + 1);
                
                let playlistIds: string[] = [];
                
                if (isLoop) {
                    // Loop mode: Play Next -> Then Previous (wrap around) -> Then Current (complete circle)
                    const prevVideos = activeList.slice(0, currentIndex);
                    // Slice to avoid URL length limits (approx 100 videos max safe limit)
                    playlistIds = [...nextVideos, ...prevVideos, activeList[currentIndex]].map(v => v.id).slice(0, 100);
                } else {
                    // Normal mode: Just play next videos
                    playlistIds = nextVideos.map(v => v.id).slice(0, 100);
                }

                if (playlistIds.length > 0) {
                    params += `&playlist=${playlistIds.join(',')}`;
                }
            }
        } else {
            // Single Video Context Loop
            if (isLoop) {
                params += `&playlist=${videoDetails.id}`;
            }
        }
        
        if (isLoop) {
             if (!params.includes('loop=1')) params += '&loop=1';
        }
        // -----------------------------------------------

        return `${src}?${params}`;
    }, [videoDetails, playerParams, isLoop, isShuffle, playlistVideos, shuffledVideos, videoId]);

    const getStreamUrl = useMemo(() => {
        if (!streamData) return null;
        if (streamData.streamingUrl) return streamData.streamingUrl;
        if (streamData.combinedFormats) {
             const format360 = streamData.combinedFormats.find((f: any) => f.quality === '360p');
             if (format360) return format360.url;
             if (streamData.combinedFormats.length > 0) return streamData.combinedFormats[0].url;
        }
        return null;
    }, [streamData]);

    const updateUrlParams = (key: string, value: string | null) => {
        const newSearchParams = new URLSearchParams(searchParams);
        if (value === null) newSearchParams.delete(key);
        else newSearchParams.set(key, value);
        setSearchParams(newSearchParams, { replace: true });
    };

    const toggleShuffle = () => {
        const newShuffleState = !isShuffle;
        setIsShuffle(newShuffleState);
        updateUrlParams('shuffle', newShuffleState ? '1' : null);
        if (newShuffleState) shuffleSeedRef.current = null;
    };

    const toggleLoop = () => {
        const newLoopState = !isLoop;
        setIsLoop(newLoopState);
        updateUrlParams('loop', newLoopState ? '1' : null);
    };

    const handlePlaylistReorder = (startIndex: number, endIndex: number) => {
        if (!playlistId) return;
        reorderVideosInPlaylist(playlistId, startIndex, endIndex);
    };

    const handleDownloadClick = () => {
        setIsDownloadModalOpen(true);
        if (!streamData && !isStreamDataLoading) {
            fetchStreamDataIfNeeded();
        }
    };
    
    // Apply Playback Speed & Pitch logic
    const applyPlaybackSettings = (speed: number, transpose: number) => {
        setPlaybackSpeed(speed);
        setTransposeLevel(transpose);

        if (defaultPlayerMode === 'player' && iframeRef.current && iframeRef.current.contentWindow) {
            const targetSpeed = Math.min(Math.max(speed, 0.25), 2.0); 
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [targetSpeed] }), '*'
            );
        }

        if (defaultPlayerMode === 'stream' && streamVideoRef.current) {
            let finalRate = speed;
            if (transpose !== 0) {
                const pitchFactor = Math.pow(2, transpose / 12);
                finalRate = speed * pitchFactor;
                if ('preservesPitch' in streamVideoRef.current) (streamVideoRef.current as any).preservesPitch = false;
                else if ('mozPreservesPitch' in streamVideoRef.current) (streamVideoRef.current as any).mozPreservesPitch = false;
                else if ('webkitPreservesPitch' in streamVideoRef.current) (streamVideoRef.current as any).webkitPreservesPitch = false;
            } else {
                if ('preservesPitch' in streamVideoRef.current) (streamVideoRef.current as any).preservesPitch = preservesPitch;
                else if ('mozPreservesPitch' in streamVideoRef.current) (streamVideoRef.current as any).mozPreservesPitch = preservesPitch;
                else if ('webkitPreservesPitch' in streamVideoRef.current) (streamVideoRef.current as any).webkitPreservesPitch = preservesPitch;
            }
            streamVideoRef.current.playbackRate = finalRate;
        }
    };

    const handleSpeedChange = (val: number) => applyPlaybackSettings(val, transposeLevel);

    if (isLoading) return <VideoPlayerPageSkeleton />;
    if (error && !videoDetails) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!videoDetails) return null;
    
    const mainChannel = videoDetails.collaborators && videoDetails.collaborators.length > 0 ? videoDetails.collaborators[0] : videoDetails.channel;
    const subscribed = isSubscribed(mainChannel.id);
    const handleSubscriptionToggle = () => subscribed ? unsubscribe(mainChannel.id) : subscribe(mainChannel);

    const videoForPlaylistModal: Video = {
      id: videoDetails.id, title: videoDetails.title, thumbnailUrl: videoDetails.thumbnailUrl,
      channelName: mainChannel.name, channelId: mainChannel.id, duration: videoDetails.duration, isoDuration: videoDetails.isoDuration,
      views: videoDetails.views, uploadedAt: videoDetails.uploadedAt, channelAvatarUrl: mainChannel.avatarUrl,
    };

    const hasCollaborators = videoDetails.collaborators && videoDetails.collaborators.length > 1;
    const collaboratorsList = videoDetails.collaborators || [];
    
    // Official YouTube Chat Embed
    const chatSrc = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}`;

    // Total Comment Count Display
    const commentCountDisplay = videoDetails.commentCount ? videoDetails.commentCount + '件のコメント' : (comments.length > 0 ? `${comments.length.toLocaleString()}件以上のコメント` : 'コメント');

    return (
        <div className="flex flex-col lg:flex-row gap-6 max-w-[1750px] mx-auto pt-2 md:pt-6 px-4 md:px-6 justify-center">
            <div className="flex-1 min-w-0 max-w-full">
                <div className="w-full aspect-video bg-yt-black rounded-xl overflow-hidden shadow-lg relative z-10">
                    {defaultPlayerMode === 'player' ? (
                        playerParams && videoId && (
                            <iframe ref={iframeRef} src={iframeSrc} key={iframeSrc} title={videoDetails.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                        )
                    ) : (
                        getStreamUrl ? (
                            <video ref={streamVideoRef} src={getStreamUrl} controls autoPlay playsInline loop={isLoop} className="w-full h-full" onError={(e) => console.error("Video Playback Error", e)}>お使いのブラウザは動画タグをサポートしていません。</video>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-black">
                                {isStreamDataLoading ? <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div> : <div className="text-center"><p>ストリームが見つかりませんでした。</p><button onClick={fetchStreamDataIfNeeded} className="mt-2 text-blue-400 hover:underline">再試行</button></div>}
                            </div>
                        )
                    )}
                </div>

                <div className="">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-3 mb-2">
                         <h1 className="text-lg md:text-xl font-bold text-black dark:text-white break-words flex-1">{videoDetails.title}</h1>
                        <div className="flex bg-yt-light dark:bg-yt-light-black rounded-lg p-1 flex-shrink-0 self-start">
                            <button className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${defaultPlayerMode === 'player' ? 'bg-white dark:bg-yt-spec-20 text-black dark:text-white shadow-sm' : 'text-yt-light-gray hover:text-black dark:hover:text-white'}`} onClick={() => setDefaultPlayerMode('player')}>Player</button>
                            <button className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${defaultPlayerMode === 'stream' ? 'bg-white dark:bg-yt-spec-20 text-black dark:text-white shadow-sm' : 'text-yt-light-gray hover:text-black dark:hover:text-white'}`} onClick={() => setDefaultPlayerMode('stream')}>Stream</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="flex items-center min-w-0">
                                <Link to={`/channel/${mainChannel.id}`} className="flex-shrink-0">
                                    <img 
                                        src={mainChannel.avatarUrl || 'https://www.gstatic.com/youtube/img/creator/avatar/default_64.svg'} 
                                        alt={mainChannel.name} 
                                        className="w-10 h-10 rounded-full object-cover" 
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://www.gstatic.com/youtube/img/creator/avatar/default_64.svg';
                                        }}
                                    />
                                </Link>
                                <div className="flex flex-col ml-3 mr-4 min-w-0 relative" ref={collaboratorMenuRef}>
                                    {hasCollaborators ? (
                                        <>
                                            <div className="flex items-center cursor-pointer hover:opacity-80 group select-none" onClick={() => setIsCollaboratorMenuOpen(!isCollaboratorMenuOpen)}>
                                                <span className="font-bold text-base text-black dark:text-white whitespace-nowrap">{mainChannel.name} 他</span>
                                                <div className={`transform transition-transform duration-200 ${isCollaboratorMenuOpen ? 'rotate-90' : ''}`}><ChevronRightIcon /></div>
                                            </div>
                                            {isCollaboratorMenuOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-yt-white dark:bg-yt-light-black rounded-lg shadow-xl border border-yt-spec-light-20 dark:border-yt-spec-20 z-50 overflow-hidden">
                                                    <div className="px-4 py-2 text-xs font-bold text-yt-light-gray border-b border-yt-spec-light-20 dark:border-yt-spec-20">チャンネルを選択</div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {collaboratorsList.map(collab => (
                                                            <Link key={collab.id} to={`/channel/${collab.id}`} className="flex items-center px-4 py-3 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10" onClick={() => setIsCollaboratorMenuOpen(false)}>
                                                                <img 
                                                                    src={collab.avatarUrl || 'https://www.gstatic.com/youtube/img/creator/avatar/default_64.svg'} 
                                                                    alt={collab.name} 
                                                                    className="w-8 h-8 rounded-full mr-3" 
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = 'https://www.gstatic.com/youtube/img/creator/avatar/default_64.svg';
                                                                    }}
                                                                />
                                                                <div><p className="text-sm font-semibold text-black dark:text-white">{collab.name}</p></div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link to={`/channel/${mainChannel.id}`} className="font-bold text-base text-black dark:text-white hover:text-opacity-80 block">{mainChannel.name}</Link>
                                    )}
                                    <span className="text-xs text-yt-light-gray truncate block">{mainChannel.subscriberCount}</span>
                                </div>
                            </div>
                            <button onClick={handleSubscriptionToggle} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${subscribed ? 'bg-yt-light dark:bg-[#272727] text-black dark:text-white hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f]' : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'}`}>{subscribed ? '登録済み' : 'チャンネル登録'}</button>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0 relative">
                            <div className="flex items-center bg-yt-light dark:bg-[#272727] rounded-full h-9 hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f] transition-colors flex-shrink-0">
                                <button className="flex items-center px-3 sm:px-4 h-full border-r border-yt-light-gray/20 gap-2"><LikeIcon /><span className="text-sm font-semibold">{videoDetails.likes}</span></button>
                                <button className="px-3 h-full rounded-r-full"><DislikeIcon /></button>
                            </div>
                            {/* Always allow chat toggle, useful for premieres or recent archives */}
                            <button onClick={() => setShowLiveChat(prev => !prev)} className={`flex items-center justify-center rounded-full w-9 h-9 transition-colors flex-shrink-0 ${showLiveChat ? 'bg-yt-light dark:bg-[#272727] text-yt-blue' : 'bg-yt-light dark:bg-[#272727] text-black dark:text-white hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f]'}`} title="ライブチャット表示"><ChatIcon /></button>
                            
                            <button onClick={handleDownloadClick} className="flex items-center justify-center bg-yt-light dark:bg-[#272727] rounded-full w-9 h-9 hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f] transition-colors flex-shrink-0"><DownloadIcon /></button>
                            <button onClick={() => setIsPlaylistModalOpen(true)} className="flex items-center justify-center bg-yt-light dark:bg-[#272727] rounded-full w-9 h-9 hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f] transition-colors flex-shrink-0"><SaveIcon /></button>
                            
                            <div className="relative" ref={controlsRef}>
                                <button onClick={() => setIsControlsOpen(!isControlsOpen)} className={`flex items-center justify-center rounded-full w-9 h-9 transition-colors flex-shrink-0 ${isControlsOpen ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-yt-light dark:bg-[#272727] text-black dark:text-white hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f]'}`} title="再生コントロール"><TuneIcon /></button>
                                {isControlsOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-72 bg-yt-white dark:bg-yt-light-black rounded-xl shadow-xl border border-yt-spec-light-20 dark:border-yt-spec-20 p-4 z-50 animate-scale-in">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-yt-spec-light-20 dark:border-yt-spec-20">
                                            <h3 className="font-bold text-sm">再生コントロール</h3>
                                        </div>
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm text-yt-light-gray"><SpeedIcon /> 速度</div>
                                                <span className="font-bold text-sm">{playbackSpeed.toFixed(2)}x</span>
                                            </div>
                                            <input type="range" min="0.25" max="4.0" step="0.05" value={playbackSpeed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} className="w-full accent-yt-blue h-1 bg-yt-light-gray rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`mt-4 bg-yt-spec-light-10 dark:bg-yt-dark-gray p-3 rounded-xl text-sm cursor-pointer hover:bg-yt-spec-light-20 dark:hover:bg-yt-gray transition-colors ${isDescriptionExpanded ? '' : 'h-24 overflow-hidden relative'}`} onClick={() => setIsDescriptionExpanded(prev => !prev)}>
                        <div className="font-bold mb-2 text-black dark:text-white">{videoDetails.views}  •  {videoDetails.uploadedAt}</div>
                        <div className="whitespace-pre-wrap break-words text-black dark:text-white overflow-hidden">
                            <div dangerouslySetInnerHTML={{ __html: videoDetails.description }} />
                        </div>
                        {!isDescriptionExpanded && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-yt-spec-light-10 dark:from-yt-dark-gray to-transparent flex items-end p-3 font-semibold">もっと見る</div>}
                        {isDescriptionExpanded && <div className="font-semibold mt-2">一部を表示</div>}
                    </div>

                    <div className="mt-6 hidden lg:block">
                        {/* Only show comments section if NOT live chat mode or if user manually toggles between them */}
                        {!showLiveChat && (
                            <>
                                <div className="flex flex-col mb-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-bold">{commentCountDisplay}</h2>
                                        <div className="flex gap-1 ml-4">
                                            <button onClick={() => handleCommentSortChange('top')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${commentSort === 'top' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-yt-light-gray hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'}`}>おすすめ順</button>
                                            <button onClick={() => handleCommentSortChange('newest')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${commentSort === 'newest' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-yt-light-gray hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'}`}>新しい順</button>
                                        </div>
                                    </div>
                                </div>
                                {isCommentsLoading ? <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yt-blue"></div></div> : comments.length > 0 ? (
                                    <div className="space-y-4">
                                        {comments.map((comment, idx) => <CommentComponent key={`${comment.comment_id}-${idx}`} comment={comment} />)}
                                        {/* Infinite Scroll Trigger for Comments */}
                                        {commentsContinuation && (
                                            <div ref={commentsLoaderRef} className="h-10 flex justify-center items-center">
                                                {isFetchingMoreComments && <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yt-blue"></div>}
                                            </div>
                                        )}
                                    </div>
                                ) : <div className="py-4 text-yt-light-gray">コメントはありません。</div>}
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="w-full lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col gap-4 pb-10">
                {/* Live Chat Panel (Desktop) - Always show if showLiveChat is true, even if not strictly live (replays) */}
                {showLiveChat && (
                    <div className="w-full h-[600px] bg-yt-white dark:bg-yt-light-black rounded-xl overflow-hidden border border-yt-spec-light-20 dark:border-yt-spec-20 relative hidden lg:block mb-4">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-0"><p className="text-xs text-yt-light-gray">読み込み中...</p></div>
                        <iframe src={chatSrc} className="w-full h-full relative z-10" frameBorder="0"></iframe>
                        <div className="absolute bottom-2 right-2 z-20">
                            <button onClick={() => window.open(chatSrc, 'LiveChat', 'width=400,height=600')} className="text-xs bg-yt-blue text-white px-2 py-1 rounded opacity-70 hover:opacity-100">別窓</button>
                        </div>
                    </div>
                )}

                {currentPlaylist && <PlaylistPanel playlist={currentPlaylist} authorName={currentPlaylist.authorName} videos={isShuffle ? shuffledVideos : playlistVideos} currentVideoId={videoId} isShuffle={isShuffle} isLoop={isLoop} toggleShuffle={toggleShuffle} toggleLoop={toggleLoop} onReorder={handlePlaylistReorder} />}
                
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0">
                    <button className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs md:text-sm font-semibold rounded-lg whitespace-nowrap">すべて</button>
                    <button className="px-3 py-1.5 bg-yt-light dark:bg-[#272727] text-black dark:text-white text-xs md:text-sm font-semibold rounded-lg whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700">関連動画</button>
                </div>

                <div className="flex flex-col space-y-3">
                    {relatedVideos.length > 0 ? relatedVideos.map((video, idx) => <RelatedVideoCard key={`${video.id}-${idx}`} video={video} />) : !isLoading && <div className="text-center py-4 text-yt-light-gray">関連動画が見つかりません</div>}
                    {/* Infinite Scroll for related videos could be added here if API supported clean pagination for secondary info */}
                </div>

                <div className="block lg:hidden mt-8 border-t border-yt-spec-light-20 dark:border-yt-spec-20 pt-4">
                    {showLiveChat ? (
                        <div className="w-full h-[400px] bg-yt-white dark:bg-yt-light-black rounded-xl overflow-hidden border border-yt-spec-light-20 dark:border-yt-spec-20 relative">
                             <iframe src={chatSrc} className="w-full h-full" frameBorder="0"></iframe>
                             <div className="absolute bottom-2 right-2 z-20"><button onClick={() => window.open(chatSrc, 'LiveChat', 'width=400,height=600')} className="text-xs bg-yt-blue text-white px-2 py-1 rounded opacity-70 hover:opacity-100">別窓で開く</button></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">{commentCountDisplay}</h2>
                            </div>
                            {isCommentsLoading ? <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yt-blue"></div></div> : (
                                <div className="space-y-4">
                                    {comments.map((comment, idx) => <CommentComponent key={`${comment.comment_id}-${idx}`} comment={comment} />)}
                                    {commentsContinuation && (
                                        <div ref={commentsLoaderRef} className="h-10 flex justify-center items-center">
                                            {isFetchingMoreComments && <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yt-blue"></div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {isPlaylistModalOpen && <PlaylistModal isOpen={isPlaylistModalOpen} onClose={() => setIsPlaylistModalOpen(false)} video={videoForPlaylistModal} />}
            <DownloadModal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} streamData={streamData} isLoading={isStreamDataLoading} onRetry={fetchStreamDataIfNeeded}/>
        </div>
    );
};

export default VideoPlayerPage;
