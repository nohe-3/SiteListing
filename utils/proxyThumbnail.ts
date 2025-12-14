export const getProxyThumbnailUrl = (originalUrl: string): string => {
  if (!originalUrl) return '';
  
  const videoIdMatch = originalUrl.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
  if (videoIdMatch) {
    const videoId = videoIdMatch[1];
    const qualityMatch = originalUrl.match(/\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg/);
    const quality = qualityMatch ? qualityMatch[1].replace('default', '') : 'hq';
    return `/api/thumbnail/${videoId}?quality=${quality || 'hq'}`;
  }
  
  return `/api/proxy-thumbnail?url=${encodeURIComponent(originalUrl)}`;
};

export const getDirectThumbnailUrl = (videoId: string, quality: 'maxres' | 'sd' | 'hq' | 'mq' | 'default' = 'hq'): string => {
  return `/api/thumbnail/${videoId}?quality=${quality}`;
};
