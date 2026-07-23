import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PosturePhotoStep from '../../features/posture-screening/PosturePhotoStep';
import { createPostureScreeningRepository, type PosturePhotoMeasurementSnapshot } from '../../repositories/postureScreeningRepository';
import '../../index.css';

function Harness() {
  const [repository] = useState(createPostureScreeningRepository);
  const [closed, setClosed] = useState(false);
  const [measurement, setMeasurement] = useState<PosturePhotoMeasurementSnapshot>();

  if (closed) return <p data-testid="photo-harness-closed">照片编辑器已关闭</p>;
  if (measurement) {
    return (
      <section>
        <h1>生成本次筛查结果</h1>
        <pre data-testid="photo-measurement">{JSON.stringify(measurement)}</pre>
      </section>
    );
  }
  return <PosturePhotoStep draftId="posture-photo-test" repository={repository} onBack={() => setClosed(true)} onSkip={() => setClosed(true)} onUsePhoto={setMeasurement} />;
}

export function mountPosturePhotoStep(target: HTMLElement) {
  createRoot(target).render(<Harness />);
}
