
import React, { useRef, useState, useEffect } from 'react';
import { usePreference } from '../contexts/PreferenceContext';
import { Link } from 'react-router-dom';
import { TrashIcon, DownloadIcon, SaveIcon, BlockIcon, CheckIcon } from '../components/icons/Icons';

const ManagementPage: React.FC = () => {
    const { ngChannels, removeNgChannel, hiddenVideos, unhideVideo, exportUserData, importUserData } = usePreference();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Sync State
    const [oldUrl, setOldUrl] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle');
    const [syncMessage, setSyncMessage] = useState('');

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await importUserData(file);
        }
    };

    const handleUrlSync = () => {
        if (!oldUrl) return;
        
        let targetUrl = oldUrl.trim();
        // Basic URL cleanup
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }
        // Remove trailing slashes
        targetUrl = targetUrl.replace(/\/+$/, "");
        
        // Append the sync path
        const syncUrl = `${targetUrl}/datasync?origin=${encodeURIComponent(window.location.origin)}`;

        setIsSyncing(true);
        setSyncStatus('waiting');
        setSyncMessage('古いサイトに接続しています...ポップアップがブロックされていないか確認してください。');

        // Open the old site
        const popup = window.open(syncUrl, 'XeroxYTSync', 'width=500,height=600');

        if (!popup) {
            setSyncStatus('error');
            setSyncMessage('ポップアップが開けませんでした。ブラウザの設定でポップアップを許可してください。');
            setIsSyncing(false);
            return;
        }

        // Listener for the data
        const messageListener = async (event: MessageEvent) => {
            // We use '*' in sender, but strict check here isn't strictly necessary for a personal tool,
            // but checking data structure is good practice.
            if (event.data && event.data.type === 'XEROX_DATA_EXPORT' && event.data.payload) {
                try {
                    // Import the data
                    const backupData = event.data.payload;
                    
                    // Create a pseudo-file to reuse importUserData logic which handles localStorage writes & reload
                    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
                    const file = new File([blob], "migration.json", { type: "application/json" });
                    
                    setSyncStatus('success');
                    setSyncMessage('データを受信しました！ 復元処理を実行中...');
                    
                    // Small delay to show success before reload
                    setTimeout(async () => {
                        await importUserData(file);
                        setIsSyncing(false);
                    }, 1000);

                    window.removeEventListener('message', messageListener);
                } catch (e) {
                    console.error(e);
                    setSyncStatus('error');
                    setSyncMessage('データの復元に失敗しました。');
                    setIsSyncing(false);
                }
            }
        };

        window.addEventListener('message', messageListener);

        // Cleanup listener after 60s timeout
        setTimeout(() => {
            if (isSyncing) { // If still syncing after timeout
                window.removeEventListener('message', messageListener);
                setSyncStatus('error');
                setSyncMessage('タイムアウトしました。手動でバックアップファイルを移行してください。');
                setIsSyncing(false);
            }
        }, 60000);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 text-black dark:text-white pb-20">
            <h1 className="text-2xl md:text-3xl font-bold mb-8">設定と管理</h1>

            {/* URL Migration Section (New!) */}
            <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm">
                <h2 className="text-xl font-bold border-b border-blue-200 dark:border-blue-800 pb-3 mb-4 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    別のリンクからデータを移行
                </h2>
                <p className="text-sm text-black/70 dark:text-white/70 mb-4 leading-relaxed">
                    以前使用していたURL（リンク）を入力することで、そのサイトから直接データを復元できます。<br/>
                    <span className="text-xs opacity-80">※以前のサイトにアクセス可能である必要があります。完全に閉鎖されている場合はファイルによる復元をご利用ください。</span>
                </p>

                <div className="flex flex-col md:flex-row gap-3">
                    <input 
                        type="text" 
                        value={oldUrl}
                        onChange={(e) => setOldUrl(e.target.value)}
                        placeholder="例: https://old-xerox-site.vercel.app"
                        className="flex-1 px-4 py-3 rounded-xl border border-yt-spec-light-20 dark:border-yt-spec-20 bg-white dark:bg-black/40 outline-none focus:border-yt-blue transition-colors"
                    />
                    <button 
                        onClick={handleUrlSync}
                        disabled={isSyncing || !oldUrl}
                        className="px-6 py-3 bg-yt-blue text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md whitespace-nowrap"
                    >
                        {isSyncing ? '通信中...' : 'URLから復元'}
                    </button>
                </div>

                {syncStatus !== 'idle' && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                        syncStatus === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        syncStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                        {syncStatus === 'waiting' && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
                        {syncStatus === 'success' && <CheckIcon className="w-5 h-5 fill-current" />}
                        {syncMessage}
                    </div>
                )}
            </div>

            {/* Backup & Restore Section */}
            <div className="mb-12 bg-yt-light dark:bg-yt-dark-gray p-6 rounded-2xl border border-yt-spec-light-20 dark:border-yt-spec-20 shadow-sm">
                <h2 className="text-xl font-bold border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-3 mb-4 flex items-center gap-2">
                    <SaveIcon /> ファイルによるバックアップ・復元
                </h2>
                <p className="text-sm text-yt-light-gray mb-6 leading-relaxed">
                    登録チャンネル、視聴履歴、プレイリスト、NG設定などの全データをファイル（.json）として保存したり、復元したりできます。<br/>
                    <span className="text-yt-blue font-semibold">URL移行時や機種変更時は、必ず「エクスポート」でファイルを保存してください。</span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={() => exportUserData()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-6 bg-white dark:bg-yt-light-black border border-yt-spec-light-20 dark:border-yt-spec-20 rounded-xl hover:bg-gray-50 dark:hover:bg-yt-spec-10 transition-colors group"
                    >
                        <DownloadIcon />
                        <span className="font-bold text-lg group-hover:text-yt-blue transition-colors">エクスポート (保存)</span>
                        <span className="text-xs text-yt-light-gray">現在のデータをファイルに保存します</span>
                    </button>
                    
                    <button 
                        onClick={handleImportClick}
                        className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-6 bg-white dark:bg-yt-light-black border border-yt-spec-light-20 dark:border-yt-spec-20 rounded-xl hover:bg-gray-50 dark:hover:bg-yt-spec-10 transition-colors group"
                    >
                        <SaveIcon />
                        <span className="font-bold text-lg group-hover:text-yt-blue transition-colors">インポート (復元)</span>
                        <span className="text-xs text-yt-light-gray">バックアップファイルを読み込みます</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleFileChange} 
                    />
                </div>
            </div>

            {/* Blocked Channels Section */}
            <div className="mb-12">
                <h2 className="text-xl font-bold border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-3 mb-4 flex items-center gap-2">
                    <BlockIcon /> ブロック中のチャンネル
                </h2>
                {ngChannels.length > 0 ? (
                    <div className="space-y-3">
                        {ngChannels.map(channel => (
                            <div key={channel.id} className="flex items-center justify-between p-3 bg-yt-light dark:bg-yt-dark-gray rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                                <Link to={`/channel/${channel.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                                    <img src={channel.avatarUrl} alt={channel.name} className="w-10 h-10 rounded-full group-hover:opacity-80 transition-opacity" />
                                    <span className="font-medium truncate group-hover:underline">{channel.name}</span>
                                </Link>
                                <button
                                    onClick={() => removeNgChannel(channel.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                                    title="ブロック解除"
                                >
                                    <TrashIcon />
                                    <span>解除</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-yt-light/30 dark:bg-yt-dark-gray/30 rounded-xl border border-dashed border-yt-spec-light-20 dark:border-yt-spec-20">
                        <p className="text-yt-light-gray">ブロックしているチャンネルはありません。</p>
                    </div>
                )}
            </div>

            {/* Hidden Videos Section */}
            <div className="mb-12">
                <h2 className="text-xl font-bold border-b border-yt-spec-light-20 dark:border-yt-spec-20 pb-3 mb-4 flex items-center gap-2">
                    <TrashIcon /> 「興味なし」にした動画
                </h2>
                 {hiddenVideos.length > 0 ? (
                    <div className="space-y-3">
                        {hiddenVideos.map(video => (
                            <div key={video.id} className="flex items-center justify-between p-3 bg-yt-light dark:bg-yt-dark-gray rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                                <Link to={`/watch/${video.id}`} className="flex-1 min-w-0 group">
                                    <p className="font-medium truncate group-hover:text-yt-blue transition-colors" title={video.title}>{video.title}</p>
                                    <p className="text-sm text-yt-light-gray truncate">{video.channelName}</p>
                                </Link>
                                <button
                                    onClick={() => unhideVideo(video.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-yt-blue bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-colors flex-shrink-0 ml-4"
                                    title="元に戻す"
                                >
                                    <span>元に戻す</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-yt-light/30 dark:bg-yt-dark-gray/30 rounded-xl border border-dashed border-yt-spec-light-20 dark:border-yt-spec-20">
                        <p className="text-yt-light-gray">「興味なし」として非表示にした動画はありません。</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagementPage;
