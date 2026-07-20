import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserIcon from '../components/icons/UserIcon';
import BodyChangesSection from '../features/growth/BodyChangesSection';
import BodyMetricSheet from '../features/growth/BodyMetricSheet';
import GrowthTabs from '../features/growth/GrowthTabs';
import PostureGrowthSection from '../features/growth/PostureGrowthSection';
import ProgressPhotoSheet from '../features/growth/ProgressPhotoSheet';
import TimeRangeSelector from '../features/growth/TimeRangeSelector';
import TrainingGrowthSection from '../features/growth/TrainingGrowthSection';
import { createProgressPhotoRepository } from '../repositories/progressPhotoRepository';
import type { GrowthSection, GrowthTimeRange } from '../types/growth';
import type { ProgressPhotoRecord } from '../types/progressPhoto';
import { readBodySnapshots } from '../utils/bodySnapshots';
import { readWorkoutLogs } from '../utils/workoutHistory';

export default function GrowthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSection: GrowthSection = location.pathname === '/growth/posture' ? 'posture' : 'training';
  const [localSection, setLocalSection] = useState<GrowthSection>(routeSection);
  const section = routeSection === 'posture' ? 'posture' : localSection === 'posture' ? 'training' : localSection;
  const [range, setRange] = useState<GrowthTimeRange>('3m');
  const [logs] = useState(readWorkoutLogs);
  const [bodyRecords, setBodyRecords] = useState(readBodySnapshots);
  const [bodySheetOpen, setBodySheetOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [photos, setPhotos] = useState<ProgressPhotoRecord[]>([]);
  const refreshPhotos = () => createProgressPhotoRepository().list().then(setPhotos).catch(() => setPhotos([]));
  useEffect(() => { void refreshPhotos(); }, []);

  const changeSection = (value: GrowthSection) => {
    if (value === 'posture') {
      navigate('/growth/posture');
      return;
    }
    setLocalSection(value);
    if (location.pathname !== '/growth') navigate('/growth');
  };

  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_82%_3%,rgba(190,242,48,0.11),transparent_42%)]" />
      <div className="relative mx-auto max-w-[440px]">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3"><h1 className="text-[2.15rem] font-black tracking-[-0.04em] text-white">成长</h1><span aria-hidden="true" className="text-2xl text-lime-300">↗</span></div>
            <p className="mt-1 text-sm text-zinc-400">记录变化，见证更强的自己</p>
          </div>
          <Link to="/data-management" aria-label="打开个人资料" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"><UserIcon className="h-5 w-5" /></Link>
        </header>
        <div className="mt-7 space-y-3"><GrowthTabs value={section} onChange={changeSection} />{section === 'posture' ? null : <TimeRangeSelector value={range} onChange={setRange} />}</div>
        <div className="mt-6">
          {section === 'training' ? <TrainingGrowthSection logs={logs} bodyRecords={bodyRecords} range={range} /> : null}
          {section === 'body' ? <BodyChangesSection records={bodyRecords} photos={photos} range={range} onRecord={() => setBodySheetOpen(true)} onAddPhoto={() => setPhotoSheetOpen(true)} /> : null}
          {section === 'posture' ? <PostureGrowthSection routeNotice={(location.state as { postureNotice?: string } | null)?.postureNotice} /> : null}
        </div>
      </div>
      <BodyMetricSheet open={bodySheetOpen} onClose={() => setBodySheetOpen(false)} onSaved={() => { setBodyRecords(readBodySnapshots()); setBodySheetOpen(false); }} />
      <ProgressPhotoSheet open={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} onSaved={() => { setPhotoSheetOpen(false); void refreshPhotos(); }} />
    </div>
  );
}
