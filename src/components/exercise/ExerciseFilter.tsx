import { equipmentOptions } from '../../data/equipment';
import { muscles } from '../../data/muscles';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';

interface ExerciseFilterProps {
  query: string;
  bodyPart: string;
  muscleId: string;
  equipment: string;
  onQueryChange: (value: string) => void;
  onBodyPartChange: (value: string) => void;
  onMuscleChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
}

export default function ExerciseFilter({
  query,
  bodyPart,
  muscleId,
  equipment,
  onQueryChange,
  onBodyPartChange,
  onMuscleChange,
  onEquipmentChange
}: ExerciseFilterProps) {
  return (
    <div className="rounded-2xl border border-app-line bg-app-surface p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <SearchInput label="搜索动作" value={query} placeholder="输入划船、下拉、背阔肌..." onChange={onQueryChange} />
        <Select
          label="部位"
          value={bodyPart}
          onChange={onBodyPartChange}
          options={[{ value: '', label: '全部部位' }, ...bodyPartOptions.map((item) => ({ value: item, label: item }))]}
        />
        <Select
          label="涉及肌群"
          value={muscleId}
          onChange={onMuscleChange}
          options={[{ value: '', label: '全部肌群' }, ...muscles.map((muscle) => ({ value: muscle.id, label: muscle.nameZh }))]}
        />
        <Select
          label="器械"
          value={equipment}
          onChange={onEquipmentChange}
          options={[{ value: '', label: '全部器械' }, ...equipmentOptions.map((item) => ({ value: item, label: item }))]}
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-app-muted">
        结果包含主练该肌群的动作，也包含该肌群作为次要参与的动作。
      </p>
    </div>
  );
}

const bodyPartOptions = [...new Set(muscles.map((muscle) => muscle.bodyPart)), '全身'];
