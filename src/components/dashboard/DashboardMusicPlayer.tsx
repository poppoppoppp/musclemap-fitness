import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  fetchNetEasePlaylistData,
  parseNetEasePlaylistId,
  readNetEasePlaylistId,
  removeNetEasePlaylistId,
  writeNetEasePlaylistId,
  type MusicPlaylist,
  type MusicTrack
} from '../../utils/neteasePlaylist';

function formatDuration(milliseconds?: number) {
  if (!milliseconds || milliseconds <= 0) return '0:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatCurrentTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export default function DashboardMusicPlayer() {
  const [playlistId, setPlaylistId] = useState<string | null>(() => readNetEasePlaylistId());
  const [playlist, setPlaylist] = useState<MusicPlaylist | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedPlaylistIdRef = useRef<string | null>(null);

  const currentTrack = tracks[currentTrackIndex] ?? null;

  useEffect(() => {
    if (!playlistId) return;
    if (loadedPlaylistIdRef.current === playlistId) return;

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
        setCurrentTime(0);
        setStatus('');
        loadedPlaylistIdRef.current = playlistId;
      })
      .catch(() => {
        if (!active) return;
        setPlaylist(null);
        setTracks([]);
        setCurrentTrackIndex(0);
        setIsPlaying(false);
        setError('该歌单不可外链播放，请将歌单设为公开或更换歌单');
        loadedPlaylistIdRef.current = null;
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [playlistId]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    audioRef.current?.pause();
  }, [currentTrack?.id]);

  const openImport = () => {
    setInput(playlistId ?? '');
    setError('');
    setStatus('');
    setImportOpen(true);
  };

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedId = parseNetEasePlaylistId(input);
    if (!parsedId) {
      setError('请输入有效的网易云歌单链接或 ID');
      return;
    }

    setIsLoading(true);
    setError('');
    setStatus('正在载入歌单');

    try {
      const data = await fetchNetEasePlaylistData(parsedId);
      writeNetEasePlaylistId(parsedId);
      loadedPlaylistIdRef.current = parsedId;
      setPlaylistId(parsedId);
      setPlaylist(data.playlist);
      setTracks(data.tracks);
      setCurrentTrackIndex(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setImportOpen(false);
      setStatus('');
    } catch {
      setError('该歌单不可外链播放，请将歌单设为公开或更换歌单');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    removeNetEasePlaylistId();
    audioRef.current?.pause();
    loadedPlaylistIdRef.current = null;
    setPlaylistId(null);
    setPlaylist(null);
    setTracks([]);
    setCurrentTrackIndex(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setInput('');
    setImportOpen(false);
    setError('');
    setStatus('');
  };

  const moveTrack = (direction: 1 | -1) => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((index) => (index + direction + tracks.length) % tracks.length);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      setError('');
    } catch {
      setIsPlaying(false);
      setError('当前歌曲暂时无法站外播放，请切换下一首');
    }
  };

  const progress = currentTrack?.duration ? Math.min(100, (currentTime * 1000 / currentTrack.duration) * 100) : 0;

  return (
    <section data-testid="dashboard-music-player" aria-labelledby="music-player-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="music-player-title" className="text-lg font-extrabold text-white">训练音乐</h2>
        <button type="button" onClick={openImport} className="min-h-11 py-3 text-sm font-semibold text-zinc-400 transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
          更换歌单
        </button>
      </div>

      <div className="rounded-[28px] border border-lime-300/25 bg-[radial-gradient(circle_at_80%_0%,rgba(190,242,100,0.13),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-4 shadow-[0_0_28px_rgba(132,204,22,0.12)]">
        {currentTrack && playlist ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-lime-300/35 bg-lime-300/10 px-3 py-1 text-sm font-black text-lime-300">当前播放</span>
                <p className="mt-3 truncate text-sm text-zinc-400">来自网易云歌单 · {playlist.name}</p>
              </div>
              <button type="button" onClick={openImport} className="min-h-10 shrink-0 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-300 transition hover:border-lime-300/50 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/50">
                管理
              </button>
            </div>

            <div className="mt-6 grid grid-cols-[112px_minmax(0,1fr)] gap-4 max-[360px]:grid-cols-1">
              <div className="aspect-square overflow-hidden rounded-[22px] border border-white/15 bg-black/50">
                {currentTrack.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt={`${currentTrack.name} 专辑封面`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-lime-300">♪</div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-2xl font-black text-white">{currentTrack.name}</h3>
                <p className="mt-1 truncate text-base font-semibold text-zinc-400">{currentTrack.artist}</p>

                <div className="mt-5 flex items-center gap-3">
                  <span className="w-10 text-sm font-black text-lime-300">{formatCurrentTime(currentTime)}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-lime-300 transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-black text-zinc-400">{formatDuration(currentTrack.duration)}</span>
                </div>

                <div className="mt-6 flex items-center justify-center gap-6">
                  <button type="button" aria-label="上一首" onClick={() => moveTrack(-1)} className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lime-300/60">‹</button>
                  <button type="button" aria-label={isPlaying ? '暂停' : '播放'} onClick={togglePlayback} className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-300 text-2xl font-black text-[#111509] shadow-[0_0_22px_rgba(190,242,100,0.38)] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100">
                    {isPlaying ? 'Ⅱ' : '▶'}
                  </button>
                  <button type="button" aria-label="下一首" onClick={() => moveTrack(1)} className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lime-300/60">›</button>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm font-semibold text-zinc-400">
              <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.75)]" />
              播放队列已载入完整歌单
              <span data-testid="music-track-count" className="ml-2 text-lime-300">{tracks.length} 首</span>
            </div>

            <audio
              ref={audioRef}
              src={currentTrack.audioUrl}
              preload="metadata"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onEnded={() => moveTrack(1)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onError={() => setError('当前歌曲暂时无法站外播放，请切换下一首')}
            />
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
              <button type="submit" disabled={isLoading} className="min-h-11 flex-1 rounded-full bg-lime-300 px-4 text-sm font-black text-[#10130d] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-lime-100">
                {isLoading ? '载入中' : '确认导入'}
              </button>
              {playlistId ? (
                <button type="button" onClick={handleRemove} className="min-h-11 rounded-full border border-red-300/25 px-4 text-sm font-bold text-red-200 transition hover:border-red-300/60 focus:outline-none focus:ring-2 focus:ring-red-300/40">移除歌单</button>
              ) : null}
              <button type="button" onClick={() => { setImportOpen(false); setError(''); setStatus(''); }} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-300 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">取消</button>
            </div>
          </form>
        ) : error ? (
          <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">{error}</p>
        ) : null}
      </div>

      <p className="px-2 text-center text-xs leading-5 text-zinc-500">播放能力由网易云音乐提供，部分歌曲可能受版权限制。</p>
    </section>
  );
}
