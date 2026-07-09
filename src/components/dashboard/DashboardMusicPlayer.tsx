import { useEffect, useState, type FormEvent } from 'react';
import {
  buildNetEaseSongEmbedUrl,
  fetchNetEasePlaylistData,
  parseNetEasePlaylistId,
  readNetEasePlaylistId,
  removeNetEasePlaylistId,
  writeNetEasePlaylistId,
  type MusicPlaylist,
  type MusicTrack
} from '../../utils/neteasePlaylist';

function buildNetEasePlaylistPageUrl(playlistId: string) {
  return `https://music.163.com/#/playlist?id=${playlistId}`;
}

function formatTrackCount(playlist: MusicPlaylist, tracks: MusicTrack[]) {
  return playlist.trackCount && playlist.trackCount !== tracks.length
    ? `${tracks.length} / ${playlist.trackCount} 首`
    : `${tracks.length} 首`;
}

export default function DashboardMusicPlayer() {
  const [playlistId, setPlaylistId] = useState<string | null>(() => readNetEasePlaylistId());
  const [playlist, setPlaylist] = useState<MusicPlaylist | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentTrack = tracks[currentTrackIndex] ?? null;

  useEffect(() => {
    if (!playlistId) return;

    let active = true;
    setIsLoading(true);
    setError('');
    setStatus('正在载入歌单');

    fetchNetEasePlaylistData(playlistId)
      .then((data) => {
        if (!active) return;
        setPlaylist(data.playlist);
        setTracks(data.tracks);
        setCurrentTrackIndex(0);
        setAutoplay(false);
        setStatus('');
      })
      .catch(() => {
        if (!active) return;
        setPlaylist(null);
        setTracks([]);
        setCurrentTrackIndex(0);
        setAutoplay(false);
        setStatus('');
        setError('歌单加载失败，请更换歌单后重试');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [playlistId]);

  const openImport = () => {
    setInput(playlistId ?? '');
    setError('');
    setStatus('');
    setImportOpen(true);
  };

  const handleImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedId = parseNetEasePlaylistId(input);
    if (!parsedId) {
      setError('请输入有效的网易云歌单链接或 ID');
      return;
    }

    writeNetEasePlaylistId(parsedId);
    setPlaylistId(parsedId);
    setInput(parsedId);
    setError('');
    setStatus('');
    setImportOpen(false);
  };

  const handleRemove = () => {
    removeNetEasePlaylistId();
    setPlaylistId(null);
    setPlaylist(null);
    setTracks([]);
    setCurrentTrackIndex(0);
    setAutoplay(false);
    setInput('');
    setError('');
    setStatus('');
    setImportOpen(false);
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setAutoplay(true);
  };

  return (
    <section data-testid="dashboard-music-player" aria-labelledby="music-player-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="music-player-title" className="text-lg font-extrabold text-white">训练音乐</h2>
        <button type="button" onClick={openImport} className="min-h-11 py-3 text-sm font-semibold text-zinc-400 transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
          更换歌单
        </button>
      </div>

      <div className="rounded-[28px] border border-lime-300/25 bg-[radial-gradient(circle_at_80%_0%,rgba(190,242,100,0.13),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-4 shadow-[0_0_28px_rgba(132,204,22,0.12)]">
        {playlistId && playlist && currentTrack ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-lime-300/35 bg-lime-300/10 px-3 py-1 text-sm font-black text-lime-300">网易云官方播放</span>
                <p className="mt-3 truncate text-sm text-zinc-400">来自网易云歌单 · {playlist.name}</p>
              </div>
              <button type="button" onClick={openImport} className="min-h-10 shrink-0 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-300 transition hover:border-lime-300/50 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/50">
                管理
              </button>
            </div>

            <div className="mt-5 rounded-[22px] border border-lime-300/20 bg-black/35 p-3">
              <p className="mb-2 truncate text-sm font-bold text-zinc-300">正在播放 · {currentTrack.name}</p>
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white">
                <iframe
                  key={`${currentTrack.id}-${autoplay ? 'auto' : 'manual'}`}
                  title="网易云官方单曲播放器"
                  src={buildNetEaseSongEmbedUrl(currentTrack.id, autoplay)}
                  loading="lazy"
                  allow="autoplay; encrypted-media"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="block h-[86px] w-full border-0 bg-white"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm font-semibold text-zinc-400">
              <span>
                歌单曲目
                <span data-testid="music-track-count" className="ml-2 text-lime-300">{formatTrackCount(playlist, tracks)}</span>
              </span>
              <a
                href={buildNetEasePlaylistPageUrl(playlistId)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-lime-300/30 px-3 py-2 text-lime-300 transition hover:border-lime-300/70 hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/50"
              >
                在网易云打开
              </a>
            </div>

            <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1" aria-label="网易云歌单曲目">
              {tracks.map((track, index) => {
                const selected = index === currentTrackIndex;
                return (
                  <button
                    key={track.id}
                    type="button"
                    data-testid="music-track-list-item"
                    onClick={() => selectTrack(index)}
                    aria-label={`播放 ${track.name}`}
                    className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-lime-300/50 ${
                      selected
                        ? 'border-lime-300/60 bg-lime-300/12 shadow-[0_0_18px_rgba(190,242,100,0.12)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-lime-300/35 hover:bg-lime-300/8'
                    }`}
                  >
                    <span className="w-8 shrink-0 text-center text-xs font-black text-lime-300">{index + 1}</span>
                    {track.coverUrl ? (
                      <img src={track.coverUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">♪</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white">{track.name}</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-zinc-400">{track.artist}</span>
                    </span>
                    {selected ? <span className="shrink-0 text-xs font-black text-lime-300">播放中</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,rgba(190,242,48,0.18),rgba(255,255,255,0.03))] text-lime-300">
              <span aria-hidden="true" className="flex items-end gap-1">{[3, 6, 9, 5].map((height) => <i key={height} className="w-1 rounded-full bg-current" style={{ height }} />)}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-100">准备训练音乐</p>
              <p className="mt-1 text-sm leading-5 text-zinc-400">{isLoading ? '正在载入歌单' : '导入歌单后，训练时可快速播放音乐'}</p>
            </div>
          </div>
        )}

        {importOpen ? (
          <form onSubmit={handleImport} className="mt-4 rounded-xl border border-lime-300/25 bg-black/25 p-3">
            <label htmlFor="netease-playlist-input" className="text-sm font-bold text-zinc-200">网易云歌单链接或 ID</label>
            <input
              id="netease-playlist-input"
              value={input}
              onChange={(event) => { setInput(event.target.value); if (error) setError(''); }}
              placeholder="粘贴网易云歌单链接或 ID"
              autoComplete="off"
              className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm !text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300 focus:ring-2 focus:ring-lime-300/20"
            />
            {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-300">{error}</p> : null}
            {status ? <p role="status" className="mt-2 text-sm font-semibold text-lime-300">{status}</p> : null}
            <div className="mt-3 flex gap-2">
              <button type="submit" className="min-h-11 flex-1 rounded-full bg-lime-300 px-4 text-sm font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100">
                确认导入
              </button>
              {playlistId ? (
                <button type="button" onClick={handleRemove} className="min-h-11 rounded-full border border-red-300/25 px-4 text-sm font-bold text-red-200 transition hover:border-red-300/60 focus:outline-none focus:ring-2 focus:ring-red-300/40">移除歌单</button>
              ) : null}
              <button type="button" onClick={() => { setImportOpen(false); setError(''); setStatus(''); }} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-300 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">取消</button>
            </div>
          </form>
        ) : error ? (
          <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">{error}</p>
        ) : status ? (
          <p role="status" className="mt-3 rounded-xl border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-sm font-semibold text-lime-200">{status}</p>
        ) : null}
      </div>

      <p className="px-2 text-center text-xs leading-5 text-zinc-500">播放能力由网易云音乐提供，部分歌曲可能受网易云规则限制。</p>
    </section>
  );
}
