import { useState, type FormEvent } from 'react';
import {
  buildNetEasePlaylistEmbedUrl,
  parseNetEasePlaylistId,
  readNetEasePlaylistId,
  removeNetEasePlaylistId,
  writeNetEasePlaylistId
} from '../../utils/neteasePlaylist';

export default function DashboardMusicPlayer() {
  const [playlistId, setPlaylistId] = useState<string | null>(() => readNetEasePlaylistId());
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const openImport = () => {
    setInput(playlistId ?? '');
    setError('');
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
    setImportOpen(false);
    setError('');
  };

  const handleRemove = () => {
    removeNetEasePlaylistId();
    setPlaylistId(null);
    setInput('');
    setImportOpen(false);
    setError('');
  };

  return (
    <section data-testid="dashboard-music-player" aria-labelledby="music-player-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="music-player-title" className="text-lg font-extrabold text-white">训练音乐</h2>
        <button type="button" onClick={openImport} className="min-h-11 py-3 text-sm font-semibold text-zinc-400 transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
          {playlistId ? '更换歌单' : '导入歌单'}
        </button>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-4">
        {playlistId ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white">已导入网易云歌单</p>
                <p className="mt-1 truncate text-xs text-zinc-500">歌单 ID：{playlistId}</p>
              </div>
              <button type="button" onClick={handleRemove} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-zinc-400 transition hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-300/60">移除歌单</button>
            </div>
            <iframe
              title="网易云歌单播放器"
              src={buildNetEasePlaylistEmbedUrl(playlistId)}
              loading="lazy"
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[450px] w-full rounded-xl border-0 bg-[#f5f5f5]"
            />
            <p className="mt-3 text-xs leading-5 text-zinc-500">播放能力由网易云提供，会员、版权或地区限制歌曲可能无法站外播放。</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,rgba(190,242,48,0.18),rgba(255,255,255,0.03))] text-lime-300">
              <span aria-hidden="true" className="flex items-end gap-1">{[3, 6, 9, 5].map((height) => <i key={height} className="w-1 rounded-full bg-current" style={{ height }} />)}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-100">准备训练音乐</p>
              <p className="mt-1 text-sm leading-5 text-zinc-400">导入歌单后，训练时可快速播放音乐</p>
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
            <div className="mt-3 flex gap-2">
              <button type="submit" className="min-h-11 flex-1 rounded-full bg-lime-300 px-4 text-sm font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100">确认导入</button>
              <button type="button" onClick={() => { setImportOpen(false); setError(''); }} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-300 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">取消</button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
