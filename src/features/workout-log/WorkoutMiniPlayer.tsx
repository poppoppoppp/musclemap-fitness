import { useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../music/MusicPlayerContext';

export default function WorkoutMiniPlayer({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { currentTrack, tracks, audioUrl, isPlaying, currentTime, duration, togglePlayback, playPrevious, playNext } = useMusicPlayer();
  const progress = duration > 0 && Number.isFinite(currentTime) ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  if (compact) {
    return (
      <button type="button" data-testid="workout-mini-player" onClick={() => navigate('/#music-player')} aria-label="打开完整训练音乐播放器" className="flex h-11 w-[76px] min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-white/12 bg-white/[0.035] px-1.5 text-left transition hover:border-lime-300/30 focus:outline-none focus:ring-2 focus:ring-lime-300/55 min-[390px]:w-[104px] min-[390px]:px-2">
        {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm text-zinc-500">♫</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-bold text-zinc-300">{currentTrack?.name ?? '选音乐'}</span>
          <span className="sr-only">{currentTrack?.artist ?? '暂未播放'}{currentTrack ? '' : '，选择训练音乐'}</span>
        </span>
      </button>
    );
  }

  return (
    <section
      data-testid="workout-mini-player"
      className="relative min-h-[70px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5"
    >
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => navigate('/#music-player')} aria-label="打开完整训练音乐播放器" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-lime-300/55">
          {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-lg text-zinc-600">♫</span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-zinc-100">{currentTrack?.name ?? '选择训练音乐'}</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">{currentTrack?.artist ?? '暂未播放'}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="上一首" disabled={tracks.length === 0} onClick={playPrevious} className="flex h-10 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:text-white disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/30">‹</button>
          <button type="button" aria-label={isPlaying ? '暂停' : '播放'} disabled={!audioUrl} onClick={togglePlayback} className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-lime-300/60 ${isPlaying ? 'border-lime-300 text-lime-300' : 'border-lime-300/45 text-lime-300/80 disabled:border-white/10 disabled:text-zinc-700'}`}>{isPlaying ? 'Ⅱ' : '▶'}</button>
          <button type="button" aria-label="下一首" disabled={tracks.length === 0} onClick={playNext} className="flex h-10 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:text-white disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/30">›</button>
        </div>
      </div>
      <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-px bg-white/[0.07]"><span className={`block h-full ${isPlaying ? 'bg-lime-300' : 'bg-lime-300/35'}`} style={{ width: `${progress}%` }} /></span>
    </section>
  );
}
