import { equipmentOptions } from '../../data/equipment';
import { muscles } from '../../data/muscles';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';

interface ExerciseFilterProps {
  query: string;
  muscleId: string;
  equipment: string;
  onQueryChange: (value: string) => void;
  onMuscleChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
}

export default function ExerciseFilter({
  query,
  muscleId,
  equipment,
  onQueryChange,
  onMuscleChange,
  onEquipmentChange
}: ExerciseFilterProps) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#1d1d1f] p-5">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
        <SearchInput label="搜索动作" value={query} placeholder="输入划船、下拉、背阔肌..." onChange={onQueryChange} />
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
      <p className="mt-3 text-xs leading-5 text-[#86868b]">
        结果包含主练该肌群的动作，也包含该肌群作为次要参与的动作。
      </p>
    </div>
  );
}
