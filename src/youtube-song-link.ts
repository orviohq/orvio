const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function createYoutubeSongLink(videoId: string, origin: string) {
  if (!YOUTUBE_VIDEO_ID.test(videoId)) throw Error('Invalid YouTube video');
  const url = new URL('/select/', origin);
  url.searchParams.set('youtube', videoId);
  return url.href;
}

export function parseYoutubeSongInvitation(search: string) {
  const values = new URLSearchParams(search).getAll('youtube');
  if (values.length !== 1) return null;
  return YOUTUBE_VIDEO_ID.test(values[0]) ? values[0] : null;
}

export function youtubeWatchUrl(videoId: string) {
  if (!YOUTUBE_VIDEO_ID.test(videoId)) throw Error('Invalid YouTube video');
  return `https://www.youtube.com/watch?v=${videoId}`;
}
