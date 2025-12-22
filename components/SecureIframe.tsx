import { useEffect, useRef, useState } from 'react';

/* ===== API URL 取得（変更なし） ===== */
async function getSecureUrlById(id: string, s?: boolean, retries = 3): Promise<string> {
  if (!id?.trim()) throw new TypeError('id must be a non-empty string');

  const BASE_URL = 'https://script.google.com/macros/s/AKfycbxsBUQzDAWmWTEZqcf7KJbzfTKVBm9E16AwhTyg094ffMD-2hXDrFEqOL4CyOQnTzaU/exec';
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const url = new URL(BASE_URL);
      url.searchParams.set('id', id);
      if (s === true) url.searchParams.set('s', 'true');

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.url?.startsWith('https://')) {
        throw new Error('Invalid response');
      }

      return data.url;
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

/* ===== SecureIframe ===== */
export default function SecureIframe({
  id,
  title = 'video',
  s,
  isLoop = false,
  isShuffle = false,
  playlistVideos = [],
  shuffledVideos = [],
  videoId,
}: {
  id: string;
  title?: string;
  s?: boolean;
  isLoop?: boolean;
  isShuffle?: boolean;
  playlistVideos?: { id: string }[];
  shuffledVideos?: { id: string }[];
  videoId?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setSrcDoc(null);

    getSecureUrlById(id, s)
      .then((secureBaseUrl) => {
        if (cancelled) return;

        let params = 'autoplay=1';

        /* ===== Playlist / Loop / Shuffle ロジック ===== */
        const activeList = isShuffle ? shuffledVideos : playlistVideos;

        if (activeList.length > 0 && videoId) {
          const currentIndex = activeList.findIndex((v) => v.id === videoId);

          if (currentIndex !== -1) {
            const nextVideos = activeList.slice(currentIndex + 1);
            let playlistIds: string[] = [];

            if (isLoop) {
              const prevVideos = activeList.slice(0, currentIndex);
              playlistIds = [...nextVideos, ...prevVideos, activeList[currentIndex]].map((v) => v.id).slice(0, 100);
            } else {
              playlistIds = nextVideos.map((v) => v.id).slice(0, 100);
            }

            if (playlistIds.length > 0) {
              params += `&playlist=${playlistIds.join(',')}`;
            }
          }
        } else if (isLoop) {
          params += `&playlist=${id}`;
        }

        if (isLoop) {
          params += '&loop=1';
        }
        /* ============================================ */

        setSrc(`${secureBaseUrl}?${params}`);
      })
      .catch(() => {
        if (!cancelled) {
          setSrcDoc(`
<!DOCTYPE html>
<html lang="ja">
<meta charset="utf-8" />
<style>
  body {
    margin: 0;
    background: black;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, sans-serif;
  }
</style>
<body>
  <p>動画を読み込めませんでした</p>
</body>
</html>
          `);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, s, isLoop, isShuffle, playlistVideos, shuffledVideos, videoId]);

  return (
    <iframe
      ref={iframeRef}
      src={src ?? undefined}
      srcDoc={srcDoc ?? undefined}
      key={src ?? 'error'}
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="w-full h-full"
    />
  );
}
