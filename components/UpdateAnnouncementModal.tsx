import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, CheckIcon } from './icons/Icons';

interface UpdateAnnouncementModalProps {
    onClose: () => void;
}

const UpdateAnnouncementModal: React.FC<UpdateAnnouncementModalProps> = ({ onClose }) => {
    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
            <div 
                className="bg-yt-white dark:bg-yt-light-black w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-yt-spec-light-20 dark:border-yt-spec-20" 
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
                    <h2 className="text-2xl font-bold mb-1">Update Information</h2>
                    <p className="text-white/80 text-sm">XeroxYT-NTv3 Latest Changes</p>
                </div>
                
                <div className="p-6 md:p-8">
                    <h3 className="text-lg font-bold text-black dark:text-white mb-4 border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-2">
                        更新内容
                    </h3>
                    
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-1 rounded-full text-green-600 dark:text-green-400">
                                <CheckIcon className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <strong className="block text-black dark:text-white text-lg">ストリーミング再生(絶対にブロックされない再生方法)</strong>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full text-blue-600 dark:text-blue-400">
                                <CheckIcon className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <strong className="block text-black dark:text-white text-lg">ダウンロード機能実装</strong>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-purple-100 dark:bg-purple-900/30 p-1 rounded-full text-purple-600 dark:text-purple-400">
                                <CheckIcon className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <strong className="block text-black dark:text-white text-lg">Liteモード追加</strong>
                                <span className="text-sm text-yt-light-gray">軽量で高速な簡易再生モード</span>
                            </div>
                        </li>
                    </ul>

                    <div className="mt-8 flex justify-center">
                        <button 
                            onClick={onClose}
                            className="bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-full hover:opacity-80 transition-opacity shadow-lg"
                        >
                            確認
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UpdateAnnouncementModal;