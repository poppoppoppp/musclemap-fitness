import PageHeader from '../components/layout/PageHeader';
import ExerciseCard from '../components/exercise/ExerciseCard';
import ExerciseFilter from '../components/exercise/ExerciseFilter';
import EmptyState from '../components/ui/EmptyState';
import { exercises } from '../data/exercises';
import { useAppStore } from '../store/useAppStore';
import { filterExercises } from '../utils/filters';

export default function ExerciseLibrary() {
  const query = useAppStore((state) => state.exerciseSearch);
  const muscleId = useAppStore((state) => state.selectedMuscleFilter);
  const equipment = useAppStore((state) => state.selectedEquipmentFilter);
  const setQuery = useAppStore((state) => state.setExerciseSearch);
  const setMuscleId = useAppStore((state) => state.setSelectedMuscleFilter);
  const setEquipment = useAppStore((state) => state.setSelectedEquipmentFilter);

  const filteredExercises = filterExercises(exercises, { query, muscleId, equipment });

  return (
    <div>
      <PageHeader title="动作库" description="搜索动作，或按涉及肌群和器械筛选。V0.1 内置背部相关动作。" />
      <ExerciseFilter
        query={query}
        muscleId={muscleId}
        equipment={equipment}
        onQueryChange={setQuery}
        onMuscleChange={setMuscleId}
        onEquipmentChange={setEquipment}
      />
      <div className="mt-4 text-sm text-slate-400">共 {filteredExercises.length} 个动作</div>
      {filteredExercises.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} selectedMuscleFilter={muscleId} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState title="没有找到匹配动作" description="可以减少筛选条件，或换一个关键词试试。" />
        </div>
      )}
    </div>
  );
}
