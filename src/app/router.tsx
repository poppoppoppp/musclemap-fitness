import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DataManagement from '../pages/DataManagement';
import Dashboard from '../pages/Dashboard';
import ExerciseDetail from '../pages/ExerciseDetail';
import ExerciseLibrary from '../pages/ExerciseLibrary';
import MuscleMap from '../pages/MuscleMap';
import NewTrainingTemplate from '../pages/NewTrainingTemplate';
import PlanBuilder from '../pages/PlanBuilder';
import TwoDMuscleSelector from '../pages/TwoDMuscleSelector';
import WorkoutHistory from '../pages/WorkoutHistory';
import WorkoutLog from '../pages/WorkoutLog';
import WorkoutLogDetail from '../pages/WorkoutLogDetail';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'muscle-map', element: <MuscleMap /> },
      { path: 'exercises', element: <ExerciseLibrary /> },
      { path: 'exercises/:exerciseId', element: <ExerciseDetail /> },
      { path: 'plan-builder', element: <PlanBuilder /> },
      { path: 'templates/new', element: <NewTrainingTemplate /> },
      { path: 'data-management', element: <DataManagement /> },
      { path: 'three-muscle-selector', element: <TwoDMuscleSelector /> },
      { path: 'three-muscle-demo', element: <TwoDMuscleSelector /> },
      { path: 'workout-log', element: <WorkoutLog /> },
      { path: 'workout-history', element: <WorkoutHistory /> },
      { path: 'workout-history/:logId', element: <WorkoutLogDetail /> }
    ]
  }
]);
