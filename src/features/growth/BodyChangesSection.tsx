import type { BodyMetricRecord } from '../../types/body';
import type { GrowthTimeRange } from '../../types/growth';
import BodyMetricsCard from './BodyMetricsCard';
import GrowthReplayCard from './GrowthReplayCard';
import ProgressPhotosCard from './ProgressPhotosCard';
import type { ProgressPhotoRecord } from '../../types/progressPhoto';

export default function BodyChangesSection({ records, photos, range, onRecord, onAddPhoto }: { records: BodyMetricRecord[]; photos: ProgressPhotoRecord[]; range: GrowthTimeRange; onRecord: () => void; onAddPhoto: () => void }) {
  return <div role="tabpanel" aria-label="身体变化" className="space-y-5"><BodyMetricsCard records={records} range={range} onRecord={onRecord} /><ProgressPhotosCard photos={photos} onAdd={onAddPhoto} /><GrowthReplayCard /></div>;
}
