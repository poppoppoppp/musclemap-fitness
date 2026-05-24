import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Dashboard from '../pages/Dashboard';
import ExerciseDetail from '../pages/ExerciseDetail';
import ExerciseLibrary from '../pages/ExerciseLibrary';
import MuscleMap from '../pages/MuscleMap';
import PlanBuilder from '../pages/PlanBuilder';
import WorkoutLog from '../pages/WorkoutLog';

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
      { path: 'workout-log', element: <WorkoutLog /> }
    ]
  }
]);
