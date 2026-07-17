import { postureScreeningEvidence } from '../../data/posture/postureScreeningEvidence';

export default function PostureEvidenceDetails({ evidenceIds }: { evidenceIds: string[] }) {
  const uniqueIds = [...new Set(evidenceIds)];
  const records = uniqueIds.flatMap((id) => {
    const record = postureScreeningEvidence.find((item) => item.id === id);
    return record ? [record] : [];
  });
  if (!records.length) return null;

  return (
    <section className="mt-7" aria-labelledby="evidence-sources-title">
      <h2 id="evidence-sources-title" className="text-lg font-black">证据来源与适用边界</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">这些资料支撑具体问题、测量方法或解释边界，不表示某一篇研究验证了本应用的整套筛查流程。</p>
      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {records.map((record) => (
          <details key={record.id} className="group py-4">
            <summary className="cursor-pointer list-none text-sm font-black leading-6 text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">{record.source.title}</summary>
            <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-400">
              <p><span className="font-bold text-zinc-300">支持范围：</span>{record.allowedConclusions.join('；')}</p>
              <p><span className="font-bold text-zinc-300">证据等级：</span>{gradeLabel(record.evidenceGrade.level)}，{record.evidenceGrade.basis}</p>
              <a href={record.source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-bold text-lime-300 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">查看公开来源</a>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function gradeLabel(level: 'supportive' | 'limited' | 'context-only'): string {
  if (level === 'supportive') return '支持性证据';
  if (level === 'limited') return '有限证据';
  return '仅用于解释背景';
}
