import InteractiveMuscleMap2D from './InteractiveMuscleMap2D';
import type { BodyView } from '../../types/common';

interface MuscleSvgMapProps {
  bodyView: BodyView;
  selectedMuscleId: string;
  onSelectMuscle: (muscleId: string) => void;
}

export default function MuscleSvgMap({ selectedMuscleId, onSelectMuscle }: MuscleSvgMapProps) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#1d1d1f] p-4">
      <InteractiveMuscleMap2D selectedMuscleId={selectedMuscleId} onSelectMuscle={onSelectMuscle} />
    </div>
  );
}
