
import React, { useState } from 'react';
import { useHistory } from '../contexts/HistoryContext';
import { usePreference } from '../contexts/PreferenceContext';
import { CloseIcon, TrashIcon } from './icons/Icons';
import type { Video } from '../types';

interface HistoryDeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HistoryDeletionModal: React.FC<HistoryDeletionModalProps> = ({ isOpen, onClose }) => {
    const { history, removeVideosFromHistory } = useHistory();
    const { removeNegativeProfileForVideos } = usePreference();
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const handleToggleVideo = (videoId: string) => {
        const newSelected = new Set(selectedVideoIds);
        if (newSelected.has(videoId)) {
            newSelected.delete(videoId);
        } else {
            newSelected.add(videoId);
        }
        setSelectedVideoIds(newSelected);
    };

    const handleDeleteSelected = () => {
        if (selectedVideoIds.size > 0) {
            if (window.confirm(`${selectedVideoIds.size}件の履歴を削除しますか？`)) {
                const videosToDelete = history.filter(v => selectedVideoIds.has(v.id));
                
                // Remove from history and also clear any associated negative learning profile
                removeVideosFromHistory(Array.from(selectedVideoIds));
                removeNegativeProfileForVideos(videosToDelete);

                setSelectedVideoIds(new Set());
            }
        }
    };

    const handleSelectAll = () => {
        if (selectedVideoIds.size === history.length) {
            setSelectedVideoIds(new Set());
        } else {
            setSelectedVideoIds(new Set(history.map(v => v.id)));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-yt-white/90 dark:bg-yt-light-black/80 backdrop-blur-lg w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh] border border-yt-spec-light-20 dark:border-yt-spec-20 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-yt-spec-light-20 dark:border-yt-spec-20 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-black dark:text-white">視聴履歴の管理</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="p-2 border-b border-yt-spec-light-20 dark:border-yt-spec-20 flex justify-between items-center bg-yt-light/50 dark:bg-yt-black/50">
                    <button 
                        onClick={handleSelectAll}
                        className="text-sm font-semibold text-black dark:text-white px-4 py-2 rounded-lg hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10"
                    >
                        {selectedVideoIds.size === history.length ? 'すべて選択解除' : 'すべて選択'}
                    </button>
                    <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedVideoIds.size === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm transition-colors ${selectedVideoIds.size > 0 ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-yt-light-gray cursor-not-allowed'}`}
                    >
                        <TrashIcon />
                        <span>削除 ({selectedVideoIds.size})</span>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4">
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-yt-light-gray">履歴はありません。</div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((video) => (
                                <div 
                                    key={video.id} 
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedVideoIds.has(video.id) ? 'bg-yt-blue/10 dark:bg-yt-blue/20 border border-yt-blue/30' : 'hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 border border-transparent'}`}
                                    onClick={() => handleToggleVideo(video.id)}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedVideoIds.has(video.id)}
                                        onChange={() => {}} // Handled by div click
                                        className="w-5 h-5 accent-yt-blue cursor-pointer"
                                    />
                                    <div className="relative w-32 aspect-video flex-shrink-0 rounded overflow-hidden bg-yt-light-gray">
                                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-black dark:text-white line-clamp-2">{video.title}</h3>
                                        <p className="text-xs text-yt-light-gray mt-1">{video.channelName}</p>
                                        <p className="text-xs text-yt-light-gray">{video.views}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryDeletionModal;