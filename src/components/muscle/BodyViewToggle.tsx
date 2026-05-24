import type { BodyView } from '../../types/common';
import Button from '../ui/Button';

interface BodyViewToggleProps {
  value: BodyView;
  onChange: (view: BodyView) => void;
}

export default function BodyViewToggle({ value, onChange }: BodyViewToggleProps) {
  return (
    <div className="flex gap-2" aria-label="人体视图切换">
      <Button variant={value === 'back' ? 'primary' : 'secondary'} onClick={() => onChange('back')}>
        背面视图
      </Button>
      <Button variant={value === 'front' ? 'primary' : 'secondary'} onClick={() => onChange('front')}>
        正面占位
      </Button>
    </div>
  );
}
