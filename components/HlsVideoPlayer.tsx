
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
}

const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({ src, autoPlay = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset error on src change
    setError(null);

    const handleHlsError = (_event: any, data: any) => {
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error("HLS Network Error:", data);
                    if(hlsRef.current) hlsRef.current.startLoad();
                    setError("ネットワークエラーが発生しました。");
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.warn("HLS Media Error, recovering...", data);
                    if(hlsRef.current) hlsRef.current.recoverMediaError();
                    break;
                default:
                    console.error("HLS Fatal Error:", data);
                    if(hlsRef.current) hlsRef.current.destroy();
                    setError("再生エラーが発生しました。");
                    break;
            }
        }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: function (xhr, url) {
            // Some proxies might require specific headers, but generally raw fetch handles it.
            // If CORS is an issue, this won't fix it on the client side without a proxy.
        }
      });
      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
            video.play().catch(e => console.warn("Autoplay prevented:", e));
        }
      });

      hls.on(Hls.Events.ERROR, handleHlsError);

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      if (autoPlay) {
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.warn("Autoplay prevented:", e));
        });
      }
      // Basic native error handling
      video.addEventListener('error', (e) => {
          console.error("Native Video Error", e);
          setError("再生できませんでした。");
      });
    } else {
        setError("このブラウザはHLS再生に対応していません。");
    }
  }, [src, autoPlay]);

  return (
    <div className="relative w-full h-full bg-black">
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 text-white p-4 text-center">
                <div>
                    <p className="mb-2 font-bold text-red-500">エラー</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        )}
        <video
            ref={videoRef}
            controls
            className="w-full h-full object-contain"
            playsInline
        />
    </div>
  );
};

export default HlsVideoPlayer;
