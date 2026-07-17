import { type ChangeEvent, type ComponentType, type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import ChevronIcon from '../components/icons/ChevronIcon';
import ClockIcon from '../components/icons/ClockIcon';
import DocumentIcon from '../components/icons/DocumentIcon';
import DumbbellIcon from '../components/icons/DumbbellIcon';
import UserIcon from '../components/icons/UserIcon';
import WorkoutIcon from '../components/icons/WorkoutIcon';
import type { BackupSummary, MuscleMapBackupFile } from '../types/backup';
import { getLatestBodySnapshot, readBodySnapshots } from '../utils/bodySnapshots';
import {
  applyBackupData,
  backupErrorMessages,
  createBackupFile,
  readCurrentBackupData,
  summarizeBackupData,
  validateBackupText
} from '../utils/backup';
import { readWorkoutLogs } from '../utils/workoutHistory';

const storageFailureMessage = '写入本地存储失败，请检查浏览器存储权限或剩余空间。';

export default function DataManagement() {
  const [backupOpen, setBackupOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(() => summarizeBackupData(readCurrentBackupData()));
  const [pendingBackup, setPendingBackup] = useState<MuscleMapBackupFile | null>(null);
  const [pendingSummary, setPendingSummary] = useState<BackupSummary | null>(null);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info');
  const [trainingCount] = useState(() => readWorkoutLogs().length);
  const [latestBodySnapshot] = useState(() => getLatestBodySnapshot(readBodySnapshots()));
  const emptyExportNotice = currentSummary.workoutLogCount === 0 && currentSummary.bodySnapshotCount === 0 && currentSummary.trainingTemplateCount === 0 && currentSummary.posturePlanCount === 0 && currentSummary.postureScreeningSessionCount === 0
    ? '当前没有训练记录、身体记录、训练模板、体态计划或体态筛查，导出的文件只包含空数据结构。'
    : '';

  const showStatus = (message: string, kind: 'info' | 'success' | 'error' = 'info') => {
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

    if (!file || !file.name.toLowerCase().endsWith('.json')) {
      showStatus('请选择 JSON 文件。', 'error');
      return;
    }

    const result = validateBackupText(await file.text());
    if (!result.ok) {
      showStatus(backupErrorMessages[result.error], 'error');
      return;
    }

    setPendingBackup(result.backup);
    setPendingSummary(result.summary);
    showStatus('备份文件校验通过，请确认是否覆盖当前本地数据。');
  };

  const handleConfirmImport = () => {
    if (!pendingBackup) return;
    if (!applyBackupData(pendingBackup.data)) {
      showStatus(storageFailureMessage, 'error');
      return;
    }

    setCurrentSummary(summarizeBackupData(readCurrentBackupData()));
    setPendingBackup(null);
    setPendingSummary(null);
    showStatus('导入成功，当前本地数据已更新。', 'success');
  };

  const statusClass = statusKind === 'error'
    ? 'text-red-300'
    : statusKind === 'success'
      ? 'text-lime-300'
      : 'text-zinc-300';

  return (
    <div className="profile-dark relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_82%_4%,rgba(190,242,48,0.11),transparent_44%)]" />
      <div className="relative mx-auto max-w-[440px] space-y-8">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <h1 className="text-[2.15rem] font-black tracking-[-0.045em] text-white">我的</h1>
          <button
            type="button"
            aria-label="用户资料"
            onClick={() => showStatus('用户资料功能开发中')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/70"
          >
            <UserIcon className="h-5 w-5" />
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[24px] border border-lime-300/30 bg-[#111711]/90 px-5 py-6">
          <div aria-hidden="true" className="absolute -right-24 top-5 h-64 w-64 rounded-full border border-lime-300/35" />
          <div aria-hidden="true" className="absolute -right-10 top-20 h-36 w-24 rounded-[50%] border border-lime-300/10" />
          <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-16 -skew-x-[32deg] bg-gradient-to-r from-transparent via-lime-300/[0.07] to-transparent blur-sm" />

          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-lime-300/60 bg-black/25 text-lime-300">
              <DumbbellIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-7 text-[1.7rem] font-black tracking-[-0.04em] text-white">我的训练档案</h2>

            <div className="mt-6 grid grid-cols-3">
              <ProfileMetric label="训练次数" value={`${trainingCount}次`} testId="profile-training-count" />
              <ProfileMetric label="当前体重" value={formatMeasurement(latestBodySnapshot?.weightKg, 'kg')} testId="profile-current-weight" separated />
              <ProfileMetric label="当前腰围" value={formatMeasurement(latestBodySnapshot?.waistCm, 'cm')} testId="profile-current-waist" separated />
            </div>

            <button
              type="button"
              onClick={() => showStatus('身体数据记录功能开发中')}
              className="mt-7 flex min-h-14 w-full items-center justify-between rounded-full bg-lime-300 py-2 pl-6 pr-2 text-base font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100 focus:ring-offset-2 focus:ring-offset-[#111711] active:scale-[0.99]"
            >
              <span>记录身体数据</span>
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b0d0a] text-xl text-lime-300">→</span>
            </button>
          </div>
        </section>

        <ProfileSection title="训练管理">
          <EntryRow title="训练模板" to="/plan-builder" icon={DocumentIcon} />
          <EntryRow title="训练历史" to="/workout-history" icon={ClockIcon} />
          <EntryRow title="动作管理" to="/exercises" icon={DumbbellIcon} />
          <EntryRow title="动作进步" onClick={() => showStatus('动作进步功能开发中')} icon={WorkoutIcon} />
          <EntryRow title="身体变化" onClick={() => showStatus('身体变化功能开发中')} icon={UserIcon} />
        </ProfileSection>

        <ProfileSection title="数据与设置">
          <EntryRow
            title="数据备份"
            onClick={() => setBackupOpen((open) => !open)}
            icon={BackupIcon}
            testId="open-backup-panel"
            expanded={backupOpen}
          />
          <EntryRow title="偏好设置" onClick={() => showStatus('偏好设置功能开发中')} icon={SettingsIcon} />
        </ProfileSection>

        {backupOpen ? (
          <section data-testid="backup-panel" className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <BackupMetric label="训练记录" value={`${currentSummary.workoutLogCount} 条`} testId="backup-workout-log-count" />
              <BackupMetric label="身体记录" value={`${currentSummary.bodySnapshotCount} 条`} />
              <BackupMetric label="训练模板" value={`${currentSummary.trainingTemplateCount} 个`} testId="backup-training-template-count" />
              <BackupMetric label="体态计划" value={`${currentSummary.posturePlanCount} 条`} />
              <BackupMetric label="体态筛查" value={`${currentSummary.postureScreeningSessionCount} 条`} testId="backup-posture-screening-count" />
            </div>

            {emptyExportNotice ? <p className="text-sm leading-6 text-amber-200">{emptyExportNotice}</p> : null}
            <p className="text-sm leading-6 text-zinc-400">进行中的训练不会导出，请先结束训练后再备份。</p>
            <p className="text-sm leading-6 text-zinc-400">体态筛查原图仅保存在当前设备，不会导出。</p>
            <button type="button" data-testid="export-backup-json" onClick={handleExport} className="min-h-11 w-full rounded-full bg-lime-300 px-5 font-bold text-[#10130d] focus:outline-none focus:ring-2 focus:ring-lime-100">
              导出为 JSON
            </button>

            <label className="block text-sm font-semibold text-zinc-200" htmlFor="backup-file">选择 JSON 文件</label>
            <input
              id="backup-file"
              data-testid="import-backup-file"
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200 file:mr-2 file:rounded-full file:border-0 file:bg-lime-300 file:px-3 file:py-2 file:font-bold file:text-black focus:outline-none focus:ring-2 focus:ring-lime-300/70"
            />

            <div className="rounded-xl bg-black/20 p-3">
              <h3 className="font-bold text-white">导入摘要</h3>
              {pendingSummary ? (
                <div data-testid="import-summary" className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p>导出时间：{formatDateTime(pendingSummary.exportedAt)}</p>
                  <p>最近计划：{pendingSummary.hasLatestGeneratedPlan ? '有' : '无'}</p>
                  <p>训练记录：{pendingSummary.workoutLogCount} 条</p>
                  <p>最近训练记录：{pendingSummary.hasLatestWorkoutLog ? '有' : '无'}</p>
                  <p>身体记录：{pendingSummary.bodySnapshotCount} 条</p>
                  <p>训练模板：{pendingSummary.trainingTemplateCount} 个</p>
                  <p>体态计划：{pendingSummary.posturePlanCount} 条</p>
                  <p>体态筛查：{pendingSummary.postureScreeningSessionCount} 条</p>
                  <button type="button" data-testid="confirm-overwrite-import" onClick={handleConfirmImport} className="mt-2 min-h-11 w-full rounded-full border border-lime-300/40 px-4 font-bold text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/70">
                    确认覆盖当前本地数据
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-400">选择并校验有效备份文件后，会在这里显示导入摘要。</p>
              )}
            </div>
          </section>
        ) : null}

        <p role="status" data-testid="backup-status" className={`min-h-6 text-center text-sm ${statusClass}`}>
          {status}
        </p>
        <div data-testid="profile-content-end" className="h-px" />
      </div>
    </div>
  );
}

function ProfileMetric({ label, value, testId, separated = false }: { label: string; value: string; testId: string; separated?: boolean }) {
  return (
    <div data-testid="profile-metric" className={`min-w-0 px-2 first:pl-0 ${separated ? 'border-l border-white/15 pl-4' : ''}`}>
      <p className="whitespace-nowrap text-xs text-zinc-400 sm:text-sm">{label}</p>
      <p data-testid={testId} className="mt-2 whitespace-nowrap text-[clamp(1.15rem,5.6vw,1.65rem)] font-black tracking-[-0.04em] text-lime-300">{value}</p>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black tracking-[-0.025em] text-white">{title}</h2>
      <div className="divide-y divide-white/[0.08] overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] px-4">
        {children}
      </div>
    </section>
  );
}

interface EntryRowProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  to?: string;
  onClick?: () => void;
  testId?: string;
  expanded?: boolean;
}

function EntryRow({ title, icon: Icon, to, onClick, testId, expanded }: EntryRowProps) {
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 text-left text-base font-bold text-white">{title}</span>
      <ChevronIcon className={`h-5 w-5 text-zinc-600 transition ${expanded ? 'rotate-90' : ''}`} />
    </>
  );
  const className = 'flex min-h-[68px] w-full items-center gap-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-300/70';

  if (to) return <Link to={to} aria-label={title} className={className}>{content}</Link>;
  return (
    <button type="button" aria-label={title} data-testid={testId} aria-expanded={testId ? expanded : undefined} onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function BackupMetric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <p className="text-zinc-500">{label}</p>
      <p data-testid={testId} className="mt-1 font-bold text-lime-300">{value}</p>
    </div>
  );
}

function BackupIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V5m0 0L8 9m4-4 4 4M6 14a4 4 0 0 0 0 8h12a4 4 0 0 0 0-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 14.8 6L14.5 3h-5L9.2 6a8 8 0 0 0-1.7 1.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 9.2 18l.3 3h5l.3-3a8 8 0 0 0 1.7-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatMeasurement(value: number | undefined, unit: string) {
  return value === undefined ? '未记录' : `${value}${unit}`;
}

function formatDateTime(value?: string) {
  if (!value) return '未知';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}
