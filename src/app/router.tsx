import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DataManagement from '../pages/DataManagement';
import Dashboard from '../pages/Dashboard';
import BodyMetricHistoryPage from '../pages/BodyMetricHistoryPage';
import ExerciseDetail from '../pages/ExerciseDetail';
import ExerciseLibrary from '../pages/ExerciseLibrary';
import EditTrainingTemplate from '../pages/EditTrainingTemplate';
import GrowthPage from '../pages/GrowthPage';
import PosturePlanPage from '../pages/PosturePlanPage';
import PostureScreeningPage from '../pages/PostureScreeningPage';
import ProgressPhotoGalleryPage from '../pages/ProgressPhotoGalleryPage';
import ProgressPhotoComparePage from '../pages/ProgressPhotoComparePage';
import MuscleMap from '../pages/MuscleMap';
import MusicSettings from '../pages/MusicSettings';
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
      { path: 'music', element: <MusicSettings /> },
      { path: 'exercises', element: <ExerciseLibrary /> },
      { path: 'exercises/:exerciseId', element: <ExerciseDetail /> },
      { path: 'growth', element: <GrowthPage /> },
      { path: 'growth/posture', element: <PosturePlanPage /> },
      { path: 'growth/posture/screening', element: <PostureScreeningPage /> },
      { path: 'growth/body-records', element: <BodyMetricHistoryPage /> },
      { path: 'growth/photos', element: <ProgressPhotoGalleryPage /> },
      { path: 'growth/photos/compare/:category', element: <ProgressPhotoComparePage /> },
      { path: 'plan-builder', element: <PlanBuilder /> },
      { path: 'templates/new', element: <NewTrainingTemplate /> },
      { path: 'templates/:templateId/edit', element: <EditTrainingTemplate /> },
      { path: 'data-management', element: <DataManagement /> },
      { path: 'three-muscle-selector', element: <TwoDMuscleSelector /> },
      { path: 'three-muscle-demo', element: <TwoDMuscleSelector /> },
      { path: 'workout-log', element: <WorkoutLog /> },
      { path: 'workout-history', element: <WorkoutHistory /> },
      { path: 'workout-history/:logId', element: <WorkoutLogDetail /> }
    ]
  }
]);
