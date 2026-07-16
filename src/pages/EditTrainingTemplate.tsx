import { useParams } from 'react-router-dom';
import TrainingTemplateEditor from '../features/training-templates/TrainingTemplateEditor';

export default function EditTrainingTemplate() {
  const { templateId } = useParams();
  return <TrainingTemplateEditor mode="edit" templateId={templateId} />;
}
