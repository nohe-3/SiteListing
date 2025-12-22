import React, { forwardRef, useState, useEffect } from 'react';
import type { Video } from '../types';
// FIX: Use named import for Link from react-router-dom
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from './icons/Icons';

interface ShortsPlayerProps {
  video: Video;
  playerParams: string;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => void;
  id?: string;
  context?: {
    type: 'channel' | 'home' | 'search';
    channelId?: string;
  };
}

const ShortsPlayer = forwardRef<HTMLIFrameElement, ShortsPlayerProps>(({ video, playerParams, onLoad, id, context }, ref) => {
  // Ensure enablejsapi=1 is present to allow postMessage commands for playback control.
  const srcParams = playerParams.includes('enablejsapi=1') ? playerParams : `${playerParams}&enablejsapi=1`;
  const navigate = useNavigate();
  const fromChannel = context?.type === 'channel';

  async function getVide123(videoId2) {
    try {
      const res = await fetch(
        `https://script.google.com/macros/s/AKfycbxsBUQzDAWmWTEZqcf7KJbzfTKVBm9E16AwhTyg094ffMD-2hXDrFEqOL4CyOQnTzaU/exec?id=${encodeURIComponent(
          videoId2
        )}`
      );

      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`);
      }

      const data = await res.json();

      // {"url":"[動画.mp4]"} を想定
      if (data && typeof data.url === 'string') {
        return data.url;
      }

      throw new Error('url が JSON に存在しません');
    } catch (err) {
      console.warn('動画URL取得失敗:', err);
      return null;
    }
  }

  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    async function loadIframe() {
      if (!video?.id) return;

      const url = await getVide123(video.id);
      if (url) {
        setIframeSrc(url);
      }
    }

    loadIframe();
  }, [video?.id]);

  function normalizeYoutubeEmbedUrl(originalUrl) {
    try {
      const url = new URL(originalUrl);

      // autoplay を削除（値が何であっても消す）
      url.searchParams.delete('autoplay');

      // enablejsapi が無ければ追加
      if (!url.searchParams.has('enablejsapi')) {
        url.searchParams.set('enablejsapi', '1');
      }

      return url.toString();
    } catch (e) {
      console.warn('URL解析失敗:', e);
      return originalUrl;
    }
  }
  return (
    <div className="h-full w-full relative flex-shrink-0 bg-yt-black group">
      {fromChannel && (
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          aria-label="チャンネルに戻る"
        >
          <ChevronLeftIcon />
        </button>
      )}

      <iframe
        ref={ref}
        id={id}
        src={normalizeYoutubeEmbedUrl(iframeSrc)}
        title={video.title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={onLoad}
        className="w-full h-full pointer-events-auto"
      ></iframe>

      {/* Overlay Info - Appears on hover or standard behavior */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
        {!fromChannel && (
          <div className="flex items-center pointer-events-auto">
            <Link to={`/channel/${video.channelId}`} className="flex items-center flex-1">
              <img src={video.channelAvatarUrl} alt={video.channelName} className="w-10 h-10 rounded-full border border-white/20" />
              <span className="ml-3 font-semibold truncate drop-shadow-md">{video.channelName}</span>
            </Link>
            <button className="bg-white text-black font-semibold px-4 py-2 rounded-full text-sm flex-shrink-0 hover:bg-gray-200 transition-colors">
              登録
            </button>
          </div>
        )}
        <p className="mt-3 text-sm line-clamp-2 drop-shadow-md">{video.title}</p>
      </div>
    </div>
  );
});
export default ShortsPlayer;
