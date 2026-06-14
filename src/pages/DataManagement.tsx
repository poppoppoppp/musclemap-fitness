import { type ChangeEvent, useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import FormField from '../components/ui/FormField';
import MetricTile from '../components/ui/MetricTile';
import Notice from '../components/ui/Notice';
import SectionHeader from '../components/ui/SectionHeader';
import type { BackupSummary, MuscleMapBackupFile } from '../types/backup';
import {
  applyBackupData,
  backupErrorMessages,
  createBackupFile,
  readCurrentBackupData,
  summarizeBackupData,
  validateBackupText
} from '../utils/backup';

const storageFailureMessage = '写入本地存储失败，请检查浏览器存储权限或剩余空间。';

export default function DataManagement() {
  const [backupOpen, setBackupOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(() => summarizeBackupData(readCurrentBackupData()));
  const [pendingBackup, setPendingBackup] = useState<MuscleMapBackupFile | null>(null);
  const [pendingSummary, setPendingSummary] = useState<BackupSummary | null>(null);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info');

  const emptyExportNotice = useMemo(
    () => (currentSummary.workoutLogCount === 0 ? '当前没有训练记录，导出的文件只包含空数据结构。' : ''),
    [currentSummary.workoutLogCount]
  );

  const refreshSummary = () => {
    setCurrentSummary(summarizeBackupData(readCurrentBackupData()));
  };

  const showStatus = (message: string, kind: 'info' | 'success' | 'error') => {
    setStatus(message);
    setStatusKind(kind);
  };

  const handleExport = () => {
    const backup = createBackupFile(readCurrentBackupData());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `musclemap-backup-${backup.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus(emptyExportNotice || '导出成功。', 'success');
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPendingBackup(null);
    setPendingSummary(null);

    if (!file) {
      showStatus('请选择 JSON 文件。', 'error');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      showStatus('请选择 JSON 文件。', 'error');
      return;
    }

    const text = await file.text();
    const result = validateBackupText(text);

    if (!result.ok) {
      showStatus(backupErrorMessages[result.error], 'error');
      return;
    }

    setPendingBackup(result.backup);
    setPendingSummary(result.summary);
    showStatus('备份文件校验通过，请确认是否覆盖当前本地数据。', 'info');
  };

  const handleConfirmImport = () => {
    if (!pendingBackup) return;

    const ok = applyBackupData(pendingBackup.data);
    if (!ok) {
      showStatus(storageFailureMessage, 'error');
      return;
    }

    refreshSummary();
    setPendingBackup(null);
    setPendingSummary(null);
    showStatus('导入成功，当前本地数据已更新。', 'success');
  };

  const statusClass =
    statusKind === 'error' ? 'text-app-danger' : statusKind === 'success' ? 'text-app-success' : 'text-app-muted';

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="我的" description="管理本机保存的训练记录、计划和本地备份。" />

      <div className="mx-auto max-w-3xl space-y-4">
        <Card padding="lg">
          <SectionHeader
            title="本地数据"
            description="训练记录和计划都保存在当前浏览器中。"
            action={
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              className="sm:w-fit"
              data-testid="open-backup-panel"
              aria-expanded={backupOpen}
              onClick={() => setBackupOpen((open) => !open)}
            >
              备份
            </Button>
            }
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricTile label="最近生成计划" value={currentSummary.hasLatestGeneratedPlan ? '有' : '无'} testId="backup-plan-status" tone={currentSummary.hasLatestGeneratedPlan ? 'success' : 'neutral'} />
            <MetricTile label="训练记录数量" value={`${currentSummary.workoutLogCount} 条`} testId="backup-workout-log-count" />
            <MetricTile label="最近训练记录" value={currentSummary.hasLatestWorkoutLog ? '有' : '无'} testId="backup-latest-log-status" tone={currentSummary.hasLatestWorkoutLog ? 'success' : 'neutral'} />
          </div>
          {emptyExportNotice ? <Notice tone="warning" className="mt-4">{emptyExportNotice}</Notice> : null}
        </Card>

        {backupOpen ? (
          <div data-testid="backup-panel" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <Card>
                <SectionHeader title="导出备份" description="导出文件包含最近生成计划、训练记录列表和最近训练记录。" />
                <Notice tone="warning" className="mt-3">进行中的训练不会导出，请先结束训练后再备份。</Notice>
                <Button type="button" className="mt-4 sm:w-fit" fullWidth data-testid="export-backup-json" onClick={handleExport}>
                  导出为 JSON
                </Button>
              </Card>

              <Card>
                <SectionHeader title="导入恢复" description="当前只支持覆盖导入。确认前不会写入当前本地数据。" />
                <FormField label="选择 JSON 文件" className="mt-4">
                  <input
                    data-testid="import-backup-file"
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    className="min-h-11 w-full rounded-[14px] border border-app-line bg-app-surface px-3.5 py-2 text-sm text-app-text file:mr-3 file:rounded-full file:border-0 file:bg-app-surfaceMuted file:px-4 file:py-2 file:text-sm file:font-semibold file:text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent/20"
                  />
                </FormField>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <h2 className="text-lg font-semibold text-app-text">导入摘要</h2>
                {pendingSummary ? (
                  <div data-testid="import-summary" className="mt-4 space-y-3 text-sm text-app-muted">
                    <p>导出时间：{formatDateTime(pendingSummary.exportedAt)}</p>
                    <p>最近计划：{pendingSummary.hasLatestGeneratedPlan ? '有' : '无'}</p>
                    <p>训练记录：{pendingSummary.workoutLogCount} 条</p>
                    <p>最近训练记录：{pendingSummary.hasLatestWorkoutLog ? '有' : '无'}</p>
                    <Notice tone="warning">导入后将覆盖当前浏览器中的本地计划和训练记录。</Notice>
                    <Button type="button" fullWidth data-testid="confirm-overwrite-import" onClick={handleConfirmImport}>
                      确认覆盖当前本地数据
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-app-muted">选择并校验有效备份文件后，会在这里显示导入摘要。</p>
                )}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-app-text">状态</h2>
                <p data-testid="backup-status" className={`mt-3 min-h-6 text-sm leading-6 ${statusClass}`}>
                  {status || '暂无操作。'}
                </p>
              </Card>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return '未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN');
}
