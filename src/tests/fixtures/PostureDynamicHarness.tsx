import { createRoot } from 'react-dom/client';
import DynamicCaptureLab from '../../features/posture/capture/components/DynamicCaptureLab';

export function mountDynamicPostureLab(target: HTMLElement) {
  createRoot(target).render(<DynamicCaptureLab inferenceApiUrl="http://posture.test" onBack={() => undefined} />);
}
