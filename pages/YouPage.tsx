import React, { useState, useEffect } from 'react';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';
import { usePlaylist } from '../contexts/PlaylistContext';
import { getVideosByIds } from '../utils/api';
import type { Playlist } from '../types';
import { PlaylistIcon, PlayIcon } from '../components/icons/Icons';

const YouPage: React.FC = () => {
    const { playlists } = usePlaylist();
    const [playlistThumbnails, setPlaylistThumbnails] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchThumbnails = async () => {
            const videoIdsToFetch = playlists
                .map(p => p.videoIds[0])
                .filter((id): id is string => !!id);
            
            if (videoIdsToFetch.length > 0) {
                const videos = await getVideosByIds(videoIdsToFetch);
                const thumbnails: Record<string, string> = {};
                const videoMap = new Map(videos.map(v => [v.id, v.thumbnailUrl]));

                playlists.forEach(p => {
                    if (p.videoIds.length > 0) {
                        const thumb = videoMap.get(p.videoIds[0]);
                        if (thumb) {
                            thumbnails[p.id] = thumb;
                        }
                    }
                });
                setPlaylistThumbnails(thumbnails);
            }
        };

        fetchThumbnails();
    }, [playlists]);

    return (
        <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-6">プレイリスト</h1>
            
            {playlists.length === 0 ? (
                <p className="text-yt-light-gray">作成したプレイリストはありません。</p>
            ) : (
                <div className="space-y-4">
                    {playlists.map(playlist => {
                        const firstVideoId = playlist.videoIds[0];
                        const playAllLink = firstVideoId 
                            ? `/watch/${firstVideoId}?list=${playlist.id}`
                            : `/playlist/${playlist.id}`;
                        
                        return (
                            <div key={playlist.id} className="flex flex-col sm:flex-row gap-4">
                                <Link to={playAllLink} className="relative sm:w-80 flex-shrink-0 group">
                                    <div className="relative aspect-video bg-yt-dark-gray rounded-lg overflow-hidden">
                                        {playlistThumbnails[playlist.id] ? (
                                            <img src={playlistThumbnails[playlist.id]} alt={playlist.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-yt-gray">
                                                <PlaylistIcon className="w-12 h-12 text-yt-light-gray" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white px-2 py-1 text-sm font-semibold flex items-center justify-center">
                                            <PlaylistIcon className="w-5 h-5" />
                                            <span className="ml-2">{playlist.videoIds.length} 本の動画</span>
                                        </div>
                                         {firstVideoId && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                                <PlayIcon className="w-6 h-6 fill-current text-white" />
                                                <span>すべて再生</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <div className="flex-1 py-2">
                                    <Link to={`/playlist/${playlist.id}`}>
                                        <h2 className="text-xl font-semibold line-clamp-2 hover:text-opacity-80">{playlist.name}</h2>
                                    </Link>
                                    <p className="text-sm text-yt-light-gray mt-1">{playlist.authorName}</p>
                                    <Link to={`/playlist/${playlist.id}`} className="text-sm text-yt-light-gray hover:text-white mt-3 inline-block">
                                        プレイリスト全体を表示
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default YouPage;