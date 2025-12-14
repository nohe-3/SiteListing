import React, { useRef, useEffect } from 'react';

interface StreamingPlayerProps {
  videoUrl: string;
  audioUrl?: string;
}

const StreamingPlayer: React.FC<StreamingPlayerProps> = ({ videoUrl, audioUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video && audio) {
      const syncPlayback = () => {
        if (audio.paused !== video.paused) {
          video.paused ? audio.pause() : audio.play();
        }
        if (Math.abs(video.currentTime - audio.currentTime) > 0.2) {
          audio.currentTime = video.currentTime;
        }
      };
      
      const syncVolume = () => {
        audio.volume = video.volume;
        audio.muted = video.muted;
      };

      video.addEventListener('play', syncPlayback);
      video.addEventListener('pause', syncPlayback);
      video.addEventListener('seeking', syncPlayback);
      video.addEventListener('volumechange', syncVolume);
      
      syncVolume();

      return () => {
        video.removeEventListener('play', syncPlayback);
        video.removeEventListener('pause', syncPlayback);
        video.removeEventListener('seeking', syncPlayback);
        video.removeEventListener('volumechange', syncVolume);
      };
    }
  }, [videoUrl, audioUrl]);

  return (
    <div className="w-full h-full bg-black flex justify-center items-center">
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        controls
        autoPlay
        playsInline
        className="w-full h-full"
        muted={!!audioUrl}
      />
      {audioUrl && <audio ref={audioRef} key={audioUrl} src={audioUrl} />}
    </div>
  );
};

export default StreamingPlayer;