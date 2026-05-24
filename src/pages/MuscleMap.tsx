import PageHeader from '../components/layout/PageHeader';
import BodyViewToggle from '../components/muscle/BodyViewToggle';
import MuscleInfoPanel from '../components/muscle/MuscleInfoPanel';
import MuscleSvgMap from '../components/muscle/MuscleSvgMap';
import { getMuscleById } from '../data/muscles';
import { useAppStore } from '../store/useAppStore';

export default function MuscleMap() {
  const bodyView = useAppStore((state) => state.bodyView);
  const selectedMuscleId = useAppStore((state) => state.selectedMuscleId);
  const setBodyView = useAppStore((state) => state.setBodyView);
  const setSelectedMuscleId = useAppStore((state) => state.setSelectedMuscleId);
  const selectedMuscle = getMuscleById(selectedMuscleId) ?? getMuscleById('latissimus-dorsi');

  return (
    <div>
      <PageHeader
        title="肌群地图"
        description="点击背面图上的肌肉区域，查看功能、训练价值和推荐动作。背面视图包含背部肌群，也包含肩后侧相关肌群，例如后束三角肌。"
      />
      <div className="mb-4">
        <BodyViewToggle value={bodyView} onChange={setBodyView} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <MuscleSvgMap bodyView={bodyView} selectedMuscleId={selectedMuscleId} onSelectMuscle={setSelectedMuscleId} />
        {selectedMuscle ? <MuscleInfoPanel muscle={selectedMuscle} /> : null}
      </div>
    </div>
  );
}
