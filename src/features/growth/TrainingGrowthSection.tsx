import { useMemo, useState } from 'react';
import { strengthTrends } from '../../data/growthMockData';
import type { GrowthTimeRange } from '../../types/growth';
import type { WorkoutLog } from '../../types/workout';
import { deriveTrainingDistribution, deriveTrainingOverview } from '../../utils/growthMetrics';
import OverviewCard from './OverviewCard';
import StrengthTrendCard from './StrengthTrendCard';
import TrainingDistributionCard from './TrainingDistributionCard';

export default function TrainingGrowthSection({ logs, range }: { logs: WorkoutLog[]; range: GrowthTimeRange }) {
  const [selectedStrength, setSelectedStrength] = useState(strengthTrends[0].id);
  const overview = useMemo(() => deriveTrainingOverview(logs, range), [logs, range]);
  const distribution = useMemo(() => deriveTrainingDistribution(logs, range), [logs, range]);
  return (
    <div role="tabpanel" aria-label="训练成长" className="space-y-5">
      <OverviewCard metrics={overview} />
      <StrengthTrendCard trends={strengthTrends} selectedId={selectedStrength} onSelect={setSelectedStrength} />
      <TrainingDistributionCard items={distribution} />
    </div>
  );
}
