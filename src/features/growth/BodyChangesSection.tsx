import type { BodySnapshot } from '../../types/body';
import type { GrowthTimeRange } from '../../types/growth';
import BodyMetricsCard from './BodyMetricsCard';
import GrowthReplayCard from './GrowthReplayCard';
import ProgressPhotosCard from './ProgressPhotosCard';

export default function BodyChangesSection({ snapshots, range }: { snapshots: BodySnapshot[]; range: GrowthTimeRange }) {
  return <div role="tabpanel" aria-label="身体变化" className="space-y-5"><BodyMetricsCard snapshots={snapshots} range={range} /><ProgressPhotosCard /><GrowthReplayCard /></div>;
}
