
import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, CheckIcon, SaveIcon } from './icons/Icons';
import { usePreference } from '../contexts/PreferenceContext';

interface UpdateAnnouncementModalProps {
    onClose: () => void;
}

const UpdateAnnouncementModal: React.FC<UpdateAnnouncementModalProps> = ({ onClose }) => {
    const { importUserData } = usePreference();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await importUserData(file);
            // Don't close immediately to show success/failure logic if handled in context, 
            // but for now we rely on the alert/reload in PreferenceContext.
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
            <div 
                className="bg-yt-white dark:bg-yt-light-black w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-yt-spec-light-20 dark:border-yt-spec-20 max-h-[90vh] overflow-y-auto" 
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
                    
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-1 rounded-full text-green-600 dark:text-green-400">
                                <CheckIcon className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <strong className="block text-black dark:text-white text-lg">データ復元機能の強化</strong>
                                <span className="text-sm text-yt-light-gray">以前のURLや別デバイスで保存したバックアップファイル（.json）を、この画面からすぐに読み込めるようになりました。</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full text-blue-600 dark:text-blue-400">
                                <CheckIcon className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <strong className="block text-black dark:text-white text-lg">設定管理ページの刷新</strong>
                                <span className="text-sm text-yt-light-gray">「設定と管理」ページで、データのバックアップやブロック設定の解除が簡単に行えるようになりました。</span>
                            </div>
                        </li>
                    </ul>

                    {/* Data Restoration Section */}
                    <div className="bg-yt-light dark:bg-yt-dark-gray p-5 rounded-xl border border-yt-spec-light-20 dark:border-yt-spec-20 mb-6">
                        <h4 className="font-bold text-base text-black dark:text-white mb-2 flex items-center gap-2">
                            <SaveIcon /> データの引継ぎ・復元
                        </h4>
                        <p className="text-sm text-yt-light-gray mb-4 leading-relaxed">
                            以前のサイトで使用していたバックアップファイル（.json）をお持ちですか？<br/>
                            下のボタンからファイルを読み込むことで、登録チャンネルや設定をすぐに復元できます。
                        </p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileChange} 
                        />
                        <button 
                            onClick={handleImportClick}
                            className="w-full bg-white dark:bg-yt-light-black border border-yt-spec-light-20 dark:border-yt-spec-20 text-yt-blue font-bold py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-yt-spec-10 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <SaveIcon />
                            バックアップファイルを読み込む
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={onClose}
                            className="bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-full hover:opacity-80 transition-opacity shadow-lg"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UpdateAnnouncementModal;
