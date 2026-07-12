import { useEffect, useMemo, useState } from 'react';
import type { BodyMetricRecord } from '../../types/body';
import type { GrowthTimeRange } from '../../types/growth';
import type { WorkoutLog } from '../../types/workout';
import { deriveStrengthTrends, deriveTrainingDistributionDetails, deriveTrainingOverview } from '../../utils/growthMetrics';
import OverviewCard from './OverviewCard';
import StrengthTrendCard from './StrengthTrendCard';
import TrainingDistributionCard from './TrainingDistributionCard';
import TrainingDistributionSheet from './TrainingDistributionSheet';

export default function TrainingGrowthSection({ logs, bodyRecords, range }: { logs: WorkoutLog[]; bodyRecords: BodyMetricRecord[]; range: GrowthTimeRange }) {
  const overview = useMemo(() => deriveTrainingOverview(logs, range), [logs, range]);
  const trends = useMemo(() => deriveStrengthTrends(logs, bodyRecords, range), [bodyRecords, logs, range]);
  const distribution = useMemo(() => deriveTrainingDistributionDetails(logs, range), [logs, range]);
  const [selectedId, setSelectedId] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => { if (!trends.some((trend) => trend.exerciseId === selectedId)) setSelectedId(trends[0]?.exerciseId ?? ''); }, [selectedId, trends]);
  return <div role="tabpanel" aria-label="训练成长" className="space-y-5"><OverviewCard result={overview} /><StrengthTrendCard trends={trends} selectedId={selectedId} onSelect={setSelectedId} /><TrainingDistributionCard items={distribution} onDetails={() => setDetailsOpen(true)} /><TrainingDistributionSheet open={detailsOpen} items={distribution} range={range} onClose={() => setDetailsOpen(false)} /></div>;
}
