import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../music/MusicPlayerContext';

export default function WorkoutMiniPlayer({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 16 });
  const [expanded, setExpanded] = useState(false);
  const { currentTrack, tracks, audioUrl, isPlaying, currentTime, duration, togglePlayback, playPrevious, playNext } = useMusicPlayer();
  const progress = duration > 0 && Number.isFinite(currentTime) ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  const toggleExpanded = () => {
    if (!expanded) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPopoverPosition({
          top: rect.bottom + 8,
          right: Math.max(16, window.innerWidth - rect.right)
        });
      }
    }
    setExpanded((value) => !value);
  };

  if (compact) {
    return (
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          data-testid="workout-mini-player"
          onClick={toggleExpanded}
          aria-label={expanded ? '收起训练音乐播放器' : '展开训练音乐播放器'}
          aria-expanded={expanded}
          aria-controls="workout-music-popover"
          className={`flex h-11 w-[76px] min-w-0 items-center gap-1.5 overflow-hidden rounded-full border px-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition duration-200 focus:outline-none focus:ring-2 focus:ring-lime-300/55 min-[390px]:w-[104px] min-[390px]:px-2 ${expanded ? 'border-lime-300/45 bg-lime-300/[0.08]' : 'border-white/12 bg-white/[0.035] hover:border-lime-300/30'}`}
        >
          <span className="relative shrink-0">
            {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-sm text-zinc-500">♫</span>}
            {isPlaying ? <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d100d] bg-lime-300 shadow-[0_0_7px_rgba(190,242,100,0.65)]" /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-bold text-zinc-300">{currentTrack?.name ?? '选音乐'}</span>
            <span className="sr-only">{currentTrack?.artist ?? '暂未播放'}{currentTrack ? '' : '，选择训练音乐'}</span>
          </span>
        </button>

        <section
          id="workout-music-popover"
          data-testid="workout-mini-player-popover"
          aria-label="训练音乐控制"
          aria-hidden={!expanded}
          inert={!expanded}
          style={{ top: popoverPosition.top, right: popoverPosition.right }}
          className={`fixed z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[24px] border border-white/12 bg-[#111411]/95 p-3.5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 ease-out ${expanded ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'}`}
        >
          <div className="flex items-center gap-3">
            {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-lg" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-xl text-zinc-500">♫</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-zinc-100">{currentTrack?.name ?? '还没有选择音乐'}</p>
              <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{currentTrack?.artist ?? '打开完整音乐页选择训练歌单'}</p>
            </div>
            <button type="button" onClick={() => setExpanded(false)} aria-label="收起音乐播放器" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/25">×</button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button type="button" aria-label="上一首" disabled={tracks.length === 0} onClick={playPrevious} className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/25">‹</button>
            <button type="button" aria-label={isPlaying ? '暂停' : '播放'} disabled={!audioUrl} onClick={togglePlayback} className={`flex h-14 w-14 items-center justify-center rounded-full border text-lg font-black transition focus:outline-none focus:ring-2 focus:ring-lime-300/60 ${isPlaying ? 'border-lime-300 bg-lime-300 text-[#111411]' : 'border-lime-300/55 text-lime-300 disabled:border-white/10 disabled:text-zinc-700'}`}>{isPlaying ? 'Ⅱ' : '▶'}</button>
            <button type="button" aria-label="下一首" disabled={tracks.length === 0} onClick={playNext} className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/25">›</button>
          </div>

          <div className="mt-4">
            <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <span className={`block h-full rounded-full transition-[width] duration-300 ${isPlaying ? 'bg-lime-300' : 'bg-lime-300/45'}`} style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold tabular-nums text-zinc-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              navigate('/#music-player');
            }}
            className="mt-3 flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-bold text-zinc-400 transition hover:border-lime-300/30 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/45"
          >
            {currentTrack ? '查看完整歌单' : '去选择训练音乐'}
          </button>
        </section>
      </div>
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

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
