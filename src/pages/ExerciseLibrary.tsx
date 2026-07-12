import { useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import ExerciseCard from '../components/exercise/ExerciseCard';
import ExerciseFilter from '../components/exercise/ExerciseFilter';
import EmptyState from '../components/ui/EmptyState';
import { exercises } from '../data/exercises';
import { useAppStore } from '../store/useAppStore';
import { filterExercises } from '../utils/filters';

export default function ExerciseLibrary() {
  const [bodyPart, setBodyPart] = useState('');
  const query = useAppStore((state) => state.exerciseSearch);
  const muscleId = useAppStore((state) => state.selectedMuscleFilter);
  const equipment = useAppStore((state) => state.selectedEquipmentFilter);
  const setQuery = useAppStore((state) => state.setExerciseSearch);
  const setMuscleId = useAppStore((state) => state.setSelectedMuscleFilter);
  const setEquipment = useAppStore((state) => state.setSelectedEquipmentFilter);

  const filteredExercises = useMemo(
    () => filterExercises(exercises, { query, bodyPart, muscleId, equipment }),
    [bodyPart, equipment, muscleId, query]
  );

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader title="动作管理" description="查看内置动作，按部位、肌群或器械快速筛选。" backTo="/data-management" />
      <ExerciseFilter
        query={query}
        bodyPart={bodyPart}
        muscleId={muscleId}
        equipment={equipment}
        onQueryChange={setQuery}
        onBodyPartChange={setBodyPart}
        onMuscleChange={setMuscleId}
        onEquipmentChange={setEquipment}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-app-muted">
        <span>共 {exercises.length} 个动作</span>
        {filteredExercises.length !== exercises.length ? <span>当前显示 {filteredExercises.length} 个</span> : null}
      </div>
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
