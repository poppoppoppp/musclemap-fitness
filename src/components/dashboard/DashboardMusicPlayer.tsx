import { useState } from 'react';
import PlayIcon from '../icons/PlayIcon';

export interface MusicTrack {
  artist: string;
  durationSeconds: number;
  id: string;
  title: string;
}

interface DashboardMusicPlayerProps {
  track?: MusicTrack | null;
}

export default function DashboardMusicPlayer({ track = null }: DashboardMusicPlayerProps) {
  const [importNoticeVisible, setImportNoticeVisible] = useState(false);

  return (
    <section data-testid="dashboard-music-player" aria-labelledby="music-player-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="music-player-title" className="text-lg font-extrabold text-white">训练音乐</h2>
        <button
          type="button"
          onClick={() => setImportNoticeVisible(true)}
          className="min-h-11 py-3 text-sm font-semibold text-zinc-400 transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60"
        >
          导入歌单
        </button>
      </div>
      <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,rgba(190,242,48,0.18),rgba(255,255,255,0.03))] text-lime-300">
            <span aria-hidden="true" className="flex items-end gap-1">{[3, 6, 9, 5].map((height) => <i key={height} className="w-1 rounded-full bg-current" style={{ height }} />)}</span>
          </span>
          <div className="min-w-0 flex-1">
            {track ? (
              <><p className="truncate font-bold text-white">{track.title}</p><p className="mt-1 truncate text-sm text-zinc-400">{track.artist}</p></>
            ) : (
              <><p className="font-bold text-zinc-100">准备训练音乐</p><p className="mt-1 text-sm leading-5 text-zinc-400">导入歌单后，训练时可快速播放音乐</p></>
            )}
          </div>
          <button
            type="button"
            aria-label="播放"
            disabled={!track}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lime-300 text-[#10130d] disabled:bg-white/10 disabled:text-zinc-600"
          >
            <PlayIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex h-6 items-center gap-1" aria-hidden="true">
          {[8, 14, 10, 18, 12, 20, 9, 15, 7, 12, 5, 9, 6, 4].map((height, index) => (
            <span key={`${height}-${index}`} className="w-1 flex-1 rounded-full bg-white/10" style={{ height }} />
          ))}
        </div>
        {importNoticeVisible ? <p role="status" className="mt-3 rounded-xl bg-lime-300/10 px-3 py-2 text-sm text-lime-200">后续支持从网易云导入歌单</p> : null}
      </div>
    </section>
  );
}
