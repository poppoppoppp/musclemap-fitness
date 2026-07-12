import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  fetchNetEasePlaylistData,
  fetchNetEaseSongUrl,
  readNetEasePlaylistId,
  removeNetEasePlaylistId,
  writeNetEasePlaylistId,
  type MusicPlaylist,
  type MusicTrack
} from '../../utils/neteasePlaylist';

interface MusicPlayerContextValue {
  playlistId: string | null;
  playlist: MusicPlaylist | null;
  tracks: MusicTrack[];
  currentTrack: MusicTrack | null;
  currentTrackIndex: number;
  audioUrl: string;
  audioLoading: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  autoplay: boolean;
  error: string;
  currentTime: number;
  duration: number;
  importPlaylist: (playlistId: string) => void;
  removePlaylist: () => void;
  selectTrack: (index: number) => void;
  togglePlayback: () => void;
  playPrevious: () => void;
  playNext: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [playlistId, setPlaylistId] = useState<string | null>(() => readNetEasePlaylistId());
  const [playlist, setPlaylist] = useState<MusicPlaylist | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks[currentTrackIndex] ?? null;

  useEffect(() => {
    if (!playlistId) return;
    let active = true;
    setIsLoading(true);
    setError('');
    fetchNetEasePlaylistData(playlistId)
      .then((data) => {
        if (!active) return;
        setPlaylist(data.playlist);
        setTracks(data.tracks);
        setCurrentTrackIndex(0);
        setAutoplay(false);
      })
      .catch(() => {
        if (!active) return;
        setPlaylist(null);
        setTracks([]);
        setCurrentTrackIndex(0);
        setAutoplay(false);
        setError('歌单加载失败，请更换歌单后重试');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [playlistId]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    if (!currentTrack) {
      setAudioUrl('');
      setAudioLoading(false);
      return;
    }

    let active = true;
    setAudioUrl('');
    setAudioLoading(true);
    fetchNetEaseSongUrl(currentTrack.id)
      .then((result) => {
        if (active) setAudioUrl(result.audioUrl);
      })
      .catch(() => {
        if (active) setAudioUrl('');
      })
      .finally(() => {
        if (active) setAudioLoading(false);
      });
    return () => { active = false; };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audioUrl || !autoplay || !audio) return;
    void audio.play().catch(() => setIsPlaying(false));
  }, [audioUrl, autoplay]);

  const importPlaylist = useCallback((nextPlaylistId: string) => {
    writeNetEasePlaylistId(nextPlaylistId);
    setPlaylistId(nextPlaylistId);
    setError('');
  }, []);

  const removePlaylist = useCallback(() => {
    removeNetEasePlaylistId();
    audioRef.current?.pause();
    setPlaylistId(null);
    setPlaylist(null);
    setTracks([]);
    setCurrentTrackIndex(0);
    setAutoplay(false);
    setAudioUrl('');
    setAudioLoading(false);
    setIsPlaying(false);
    setError('');
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const selectTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    setAutoplay(true);
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [audioUrl]);

  const playPrevious = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((index) => (index - 1 + tracks.length) % tracks.length);
    setAutoplay(true);
  }, [tracks.length]);

  const playNext = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((index) => (index + 1) % tracks.length);
    setAutoplay(true);
  }, [tracks.length]);

  const value = useMemo<MusicPlayerContextValue>(() => ({
    playlistId,
    playlist,
    tracks,
    currentTrack,
    currentTrackIndex,
    audioUrl,
    audioLoading,
    isLoading,
    isPlaying,
    autoplay,
    error,
    currentTime,
    duration,
    importPlaylist,
    removePlaylist,
    selectTrack,
    togglePlayback,
    playPrevious,
    playNext
  }), [
    playlistId, playlist, tracks, currentTrack, currentTrackIndex, audioUrl, audioLoading, isLoading,
    isPlaying, autoplay, error, currentTime, duration, importPlaylist, removePlaylist, selectTrack,
    togglePlayback, playPrevious, playNext
  ]);

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        data-testid="persistent-music-audio"
        aria-label="网易云账号权限播放器"
        src={audioUrl || undefined}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={playNext}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        className="hidden"
      />
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const value = useContext(MusicPlayerContext);
  if (!value) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return value;
}
