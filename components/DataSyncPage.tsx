
import React, { useEffect, useState } from 'react';
import { XeroxLogo, CheckIcon, CloseIcon, DownloadIcon } from './icons/Icons';

const DataSyncPage: React.FC = () => {
    const [status, setStatus] = useState<'preparing' | 'sending' | 'success' | 'manual_required'>('preparing');
    const [errorMessage, setErrorMessage] = useState('');
    const [origin, setOrigin] = useState('');
    const [backupData, setBackupData] = useState<string>('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetOrigin = params.get('origin');
        setOrigin(targetOrigin || 'Unknown');

        const gatherData = () => {
            try {
                return {
                    timestamp: new Date().toISOString(),
                    subscriptions: JSON.parse(localStorage.getItem('subscribedChannels') || '[]'),
                    history: JSON.parse(localStorage.getItem('videoHistory') || '[]'),
                    playlists: JSON.parse(localStorage.getItem('playlists') || '[]'),
                    preferences: {
                        ngKeywords: JSON.parse(localStorage.getItem('ngKeywords') || '[]'),
                        ngChannels: JSON.parse(localStorage.getItem('ngChannels') || '[]'),
                        hiddenVideos: JSON.parse(localStorage.getItem('hiddenVideos') || '[]'),
                        isShortsAutoplayEnabled: localStorage.getItem('isShortsAutoplayEnabled') !== 'false',
                        isLiteMode: localStorage.getItem('isLiteMode') === 'true',
                        defaultPlayerMode: localStorage.getItem('defaultPlayerMode') || 'player'
                    }
                };
            } catch (e) {
                console.error("Data gathering failed", e);
                return null;
            }
        };

        const data = gatherData();
        if (data) {
            setBackupData(JSON.stringify(data, null, 2));
        } else {
            setStatus('manual_required');
            setErrorMessage('データの読み込みに失敗しました。');
            return;
        }

        const sendData = () => {
            setStatus('sending');
            
            if (!window.opener) {
                // Opener missing (blocked or closed)
                setStatus('manual_required');
                setErrorMessage('連携元のウィンドウが見つかりませんでした (ポップアップブロックまたはクロスオリジン制限)。手動でバックアップをダウンロードしてください。');
                return;
            }

            try {
                // Use '*' to bypass strict origin checks if users are migrating between protocols/subdomains
                // In a stricter app, we would validate targetOrigin, but for this proxy tool, flexibility is key.
                window.opener.postMessage({ type: 'XEROX_DATA_EXPORT', payload: data }, '*');
                setStatus('success');
                
                // Close automatically only on success
                setTimeout(() => {
                    window.close();
                }, 3000);
            } catch (e: any) {
                console.error(e);
                setStatus('manual_required');
                setErrorMessage('自動送信に失敗しました: ' + e.message);
            }
        };

        // Attempt send
        setTimeout(sendData, 500);

    }, []);

    const handleDownload = () => {
        if (!backupData) return;
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xeroxyt_migration_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-yt-white dark:bg-yt-black text-black dark:text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-yt-light-black rounded-2xl shadow-2xl p-8 border border-yt-spec-light-20 dark:border-yt-spec-20 text-center">
                <div className="flex justify-center mb-6">
                    <XeroxLogo className="h-12 w-auto" />
                </div>
                
                <h1 className="text-xl font-bold mb-2">データ同期</h1>
                <p className="text-sm text-yt-light-gray mb-6">
                    {origin !== 'Unknown' ? `${origin} へデータを転送しています...` : 'データを転送しています...'}
                </p>

                {status === 'preparing' || status === 'sending' ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yt-blue"></div>
                        <span className="text-sm font-medium">処理中...</span>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center gap-4 animate-scale-in">
                        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full text-green-600 dark:text-green-400">
                            <CheckIcon className="w-8 h-8 fill-current" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">送信完了</p>
                            <p className="text-sm text-yt-light-gray">このウィンドウは自動的に閉じます</p>
                        </div>
                        <button 
                            onClick={() => window.close()} 
                            className="mt-4 px-6 py-2 bg-yt-light dark:bg-yt-spec-20 rounded-full text-sm font-medium hover:bg-gray-200 dark:hover:bg-yt-spec-10 transition-colors"
                        >
                            閉じる
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 animate-scale-in">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full text-yellow-600 dark:text-yellow-400">
                            {/* Warning Icon/Info */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        <div>
                            <p className="font-bold text-lg text-yellow-600 dark:text-yellow-400">自動同期失敗</p>
                            <p className="text-sm text-yt-light-gray mt-2 mb-4 text-left break-all">
                                {errorMessage}
                            </p>
                            <p className="text-sm font-bold mb-4">
                                以下のボタンからデータをダウンロードし、新しいサイトの「設定 &gt; インポート」から読み込んでください。
                            </p>
                        </div>
                        <button 
                            onClick={handleDownload} 
                            className="flex items-center gap-2 px-6 py-3 bg-yt-blue text-white rounded-full text-sm font-bold hover:opacity-90 transition-colors w-full justify-center"
                        >
                            <DownloadIcon />
                            バックアップをダウンロード
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataSyncPage;
