import { Link } from 'react-router-dom';
import type { Exercise } from '../../types/exercise';
import Card from '../ui/Card';
import ExerciseMeta from './ExerciseMeta';

interface ExerciseCardProps {
  exercise: Exercise;
  selectedMuscleFilter?: string;
}

export default function ExerciseCard({ exercise, selectedMuscleFilter = '' }: ExerciseCardProps) {
  return (
    <Link to={`/exercises/${exercise.id}`} aria-label={`${exercise.name} 动作详情`}>
      <Card className="h-full transition duration-200 hover:border-app-accent/35 hover:bg-app-surfaceMuted">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-app-text">{exercise.name}</h2>
          <p className="mt-1 text-sm text-app-muted">{exercise.nameEn}</p>
        </div>
        <ExerciseMeta exercise={exercise} selectedMuscleFilter={selectedMuscleFilter} />
      </Card>
    </Link>
  );
}
