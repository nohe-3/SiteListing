import React from 'react';
import { usePreference } from '../contexts/PreferenceContext';
import { Link } from 'react-router-dom';
import { TrashIcon } from '../components/icons/Icons';

const ManagementPage: React.FC = () => {
    const { ngChannels, removeNgChannel, hiddenVideos, unhideVideo } = usePreference();

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 text-black dark:text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">コンテンツ管理</h1>

            {/* Blocked Channels Section */}
            <div className="mb-10">
                <h2 className="text-xl font-semibold border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-2 mb-4">ブロック中のチャンネル</h2>
                {ngChannels.length > 0 ? (
                    <div className="space-y-3">
                        {ngChannels.map(channel => (
                            <div key={channel.id} className="flex items-center justify-between p-3 bg-yt-light dark:bg-yt-dark-gray rounded-lg">
                                <Link to={`/channel/${channel.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                                    <img src={channel.avatarUrl} alt={channel.name} className="w-10 h-10 rounded-full" />
                                    <span className="font-medium truncate">{channel.name}</span>
                                </Link>
                                <button
                                    onClick={() => removeNgChannel(channel.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                    title="ブロック解除"
                                >
                                    <TrashIcon />
                                    <span className="hidden sm:inline">解除</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-yt-light-gray text-center py-4">ブロックしているチャンネルはありません。</p>
                )}
            </div>

            {/* Hidden Videos Section */}
            <div>
                <h2 className="text-xl font-semibold border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-2 mb-4">「興味なし」にした動画</h2>
                 {hiddenVideos.length > 0 ? (
                    <div className="space-y-3">
                        {hiddenVideos.map(video => (
                            <div key={video.id} className="flex items-center justify-between p-3 bg-yt-light dark:bg-yt-dark-gray rounded-lg">
                                <Link to={`/watch/${video.id}`} className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={video.title}>{video.title}</p>
                                    <p className="text-sm text-yt-light-gray truncate">{video.channelName}</p>
                                </Link>
                                <button
                                    onClick={() => unhideVideo(video.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-yt-blue hover:bg-yt-blue/10 rounded-full transition-colors"
                                    title="元に戻す"
                                >
                                    <span>元に戻す</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-yt-light-gray text-center py-4">「興味なし」として非表示にした動画はありません。</p>
                )}
            </div>
        </div>
    );
};

export default ManagementPage;