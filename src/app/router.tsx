import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DataManagement from '../pages/DataManagement';
import Dashboard from '../pages/Dashboard';
import ExerciseDetail from '../pages/ExerciseDetail';
import ExerciseLibrary from '../pages/ExerciseLibrary';
import MuscleMap from '../pages/MuscleMap';
import PlanBuilder from '../pages/PlanBuilder';
import WorkoutHistory from '../pages/WorkoutHistory';
import WorkoutLog from '../pages/WorkoutLog';
import WorkoutLogDetail from '../pages/WorkoutLogDetail';

const ThreeMuscleDemo = lazy(() => import('../pages/ThreeMuscleDemo'));
const ThreeMuscleSelector = lazy(() => import('../pages/ThreeMuscleSelector'));

function ThreeMuscleDemoRoute() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          正在加载 3D 技术预研 Demo…
        </div>
      }
    >
      <ThreeMuscleDemo />
    </Suspense>
  );
}

function ThreeMuscleSelectorRoute() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          正在加载 3D 肌群选择…
        </div>
      }
    >
      <ThreeMuscleSelector />
    </Suspense>
  );
}

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
      { path: 'data-management', element: <DataManagement /> },
      { path: 'three-muscle-selector', element: <ThreeMuscleSelectorRoute /> },
      { path: 'three-muscle-demo', element: <ThreeMuscleDemoRoute /> },
      { path: 'workout-log', element: <WorkoutLog /> },
      { path: 'workout-history', element: <WorkoutHistory /> },
      { path: 'workout-history/:logId', element: <WorkoutLogDetail /> }
    ]
  }
]);
