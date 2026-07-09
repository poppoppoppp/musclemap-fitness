const NETEASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  Referer: 'https://music.163.com/'
};

const numericIdPattern = /^\d{1,20}$/;

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function mapSong(song) {
  const album = song.album ?? song.al ?? {};
  const artists = song.artists ?? song.ar ?? [];
  const id = String(song.id ?? '');

  return {
    id,
    name: song.name ?? '未知歌曲',
    artist: artists.map((artist) => artist.name).filter(Boolean).join(' / ') || '未知歌手',
    albumName: album.name,
    coverUrl: album.picUrl,
    duration: song.duration ?? song.dt
  };
}

function normalizeAudioUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return undefined;
  return url.replace(/^http:\/\//i, 'https://');
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: NETEASE_HEADERS });
  if (!response.ok) throw new Error(`NetEase request failed: ${response.status}`);
  return response.json();
}

export default async function handler(request, response) {
  const id = String(request.query?.id ?? '');
  if (!numericIdPattern.test(id)) {
    response.status(400).json({ ok: false, error: 'invalid-id' });
    return;
  }

  try {
    const detail = await fetchJson(`https://music.163.com/api/v6/playlist/detail?id=${encodeURIComponent(id)}`);
    const playlist = detail?.playlist;
    const trackIds = Array.isArray(playlist?.trackIds) ? playlist.trackIds.map((track) => track.id).filter(Boolean) : [];

    if (detail?.code !== 200 || !playlist || trackIds.length === 0) {
      response.status(200).json({ ok: false, error: 'unavailable' });
      return;
    }

    const trackIdChunks = chunk(trackIds, 200);
    const [songBatches, playerBatches] = await Promise.all([
      Promise.all(trackIdChunks.map((ids) => fetchJson(`https://music.163.com/api/song/detail?ids=[${ids.join(',')}]`))),
      Promise.all(trackIdChunks.map((ids) => fetchJson(`https://music.163.com/api/song/enhance/player/url?ids=[${ids.join(',')}]&br=128000`)))
    ]);
    const songs = songBatches.flatMap((batch) => Array.isArray(batch?.songs) ? batch.songs : []);
    const playableUrls = new Map(
      playerBatches
        .flatMap((batch) => Array.isArray(batch?.data) ? batch.data : [])
        .filter((item) => item?.code === 200 && item?.url)
        .map((item) => [String(item.id), normalizeAudioUrl(item.url)])
    );
    const songsById = new Map(songs.map((song) => [String(song.id), song]));
    const tracks = trackIds
      .map((trackId) => {
        const id = String(trackId);
        const song = songsById.get(id);
        const audioUrl = playableUrls.get(id);
        return song && audioUrl ? { ...mapSong(song), audioUrl } : null;
      })
      .filter(Boolean);

    if (tracks.length === 0) {
      response.status(200).json({ ok: false, error: 'no-playable-tracks' });
      return;
    }

    response.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');

    response.status(200).json({
      ok: true,
      playlist: {
        id,
        name: playlist.name ?? `网易云歌单 ${id}`,
        source: 'netease',
        trackCount: playlist.trackCount ?? trackIds.length
      },
      tracks
    });
  } catch (error) {
    response.status(200).json({ ok: false, error: 'unavailable' });
  }
}
