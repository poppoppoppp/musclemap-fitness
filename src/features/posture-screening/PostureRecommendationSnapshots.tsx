import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostureRecommendationSnapshot } from '../../repositories/postureScreeningRepository';
import {
  addScreeningRecommendationToCurrentWorkout,
  addScreeningRecommendationToTrainingTemplate
} from '../../utils/postureScreeningRecommendations';
import { readTrainingTemplates } from '../../utils/trainingTemplates';

export default function PostureRecommendationSnapshots({ recommendations }: { recommendations: PostureRecommendationSnapshot[] }) {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [templatePatternId, setTemplatePatternId] = useState('');
  const [templates, setTemplates] = useState(readTrainingTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editTemplateId, setEditTemplateId] = useState('');
  if (!recommendations.length) return null;

  const showNotice = (message: string, templateId = '') => {
    setNotice(message);
    setError('');
    setEditTemplateId(templateId);
  };

  const addToWorkout = (recommendation: PostureRecommendationSnapshot) => {
    const result = addScreeningRecommendationToCurrentWorkout(recommendation);
    if (result.status === 'added') showNotice('推荐方案已加入当前训练。');
    else if (result.status === 'already-added') showNotice('该方案已在当前训练中。');
    else {
      setNotice('');
      setEditTemplateId('');
      setError(result.status === 'storage-failed' ? '当前训练保存失败，请检查浏览器存储设置。' : '该保存快照目前无法加入训练。');
    }
  };

  const openTemplatePicker = (recommendation: PostureRecommendationSnapshot) => {
    const currentTemplates = readTrainingTemplates();
    setTemplates(currentTemplates);
    setSelectedTemplateId(currentTemplates[0]?.id ?? '');
    setTemplatePatternId((current) => current === recommendation.patternId ? '' : recommendation.patternId);
    setNotice('');
    setError('');
    setEditTemplateId('');
  };

  const addToExistingTemplate = (recommendation: PostureRecommendationSnapshot) => {
    if (!selectedTemplateId) return;
    const result = addScreeningRecommendationToTrainingTemplate(recommendation, { kind: 'existing', templateId: selectedTemplateId });
    if (result.status === 'added') showNotice('推荐方案已加入训练模板。', result.templateId);
    else if (result.status === 'already-added') showNotice('该方案已在所选模板中。', result.templateId);
    else {
      setNotice('');
      setEditTemplateId('');
      setError(result.status === 'storage-failed' ? '训练模板保存失败，请检查浏览器存储设置。' : '所选模板当前无法加入该方案。');
    }
  };

  const createTemplateWithRecommendation = (recommendation: PostureRecommendationSnapshot) => {
    const result = addScreeningRecommendationToTrainingTemplate(recommendation, { kind: 'new', name: newTemplateName });
    if (result.status === 'added') {
      setTemplates(readTrainingTemplates());
      setSelectedTemplateId(result.templateId);
      setNewTemplateName('');
      showNotice('新模板已创建并加入方案。', result.templateId);
      return;
    }
    setNotice('');
    setEditTemplateId('');
    setError(result.status === 'invalid-name' ? '请输入新模板名称。' : result.status === 'storage-failed' ? '训练模板保存失败，请检查浏览器存储设置。' : '当前无法新建模板并加入该方案。');
  };

  return (
    <section className="mt-8" aria-labelledby="recommendation-snapshot-title">
      <h2 id="recommendation-snapshot-title" className="text-lg font-black">推荐体态改善方案</h2>
      <p className="mt-2 text-xs leading-5 text-zinc-400">推荐来自保存时的独立白名单快照，不是医学诊断，也不会凭空生成康复方案。</p>
      <div className="mt-4 space-y-3">
        {recommendations.map((recommendation) => (
          <article key={recommendation.patternId} className="rounded-xl border border-white/10 p-4">
            <h3 className="font-black text-white">{recommendation.protocolTitle ?? recommendation.issueNames.join('、')}</h3>
            {recommendation.status === 'available' ? (
              <>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{recommendation.userFacingGoal}</p>
                {recommendation.limitations.length ? <p className="mt-2 text-xs leading-5 text-zinc-500">限制：{recommendation.limitations.join('；')}</p> : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => addToWorkout(recommendation)} className="min-h-11 rounded-xl bg-lime-300 px-4 text-sm font-black text-zinc-950">加入当前训练</button>
                  <button type="button" onClick={() => openTemplatePicker(recommendation)} className="min-h-11 rounded-xl border border-lime-300/45 px-4 text-sm font-black text-lime-200">加入训练模板</button>
                </div>
                {templatePatternId === recommendation.patternId ? (
                  <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <label className="block text-xs font-bold text-zinc-400">
                      选择训练模板
                      <select aria-label="选择训练模板" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-[#111511] px-3 text-sm text-white">
                        {templates.length ? templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>) : <option value="">暂无训练模板</option>}
                      </select>
                    </label>
                    <button type="button" disabled={!selectedTemplateId} onClick={() => addToExistingTemplate(recommendation)} className="min-h-11 w-full rounded-xl border border-white/15 px-4 text-sm font-black text-white disabled:opacity-40">加入所选模板</button>
                    <div className="border-t border-white/10 pt-3">
                      <label className="block text-xs font-bold text-zinc-400">
                        新模板名称
                        <input aria-label="新模板名称" value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-[#111511] px-3 text-sm text-white" />
                      </label>
                      <button type="button" onClick={() => createTemplateWithRecommendation(recommendation)} className="mt-2 min-h-11 w-full rounded-xl border border-lime-300/45 px-4 text-sm font-black text-lime-200">新建模板并加入</button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : <p className="mt-2 text-sm text-zinc-400">{recommendation.reason}</p>}
          </article>
        ))}
      </div>
      {notice ? (
        <div className="mt-4">
          <p role="status" className="rounded-xl border border-lime-300/25 bg-lime-300/[0.06] px-3 py-3 text-sm text-lime-100">{notice}</p>
          {editTemplateId ? <Link to={`/templates/${editTemplateId}/edit`} className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-white/15 text-sm font-black text-zinc-100">编辑对应模板</Link> : <Link to="/workout-log" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-white/15 text-sm font-black text-zinc-100">查看当前训练</Link>}
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm text-red-100">{error}</p> : null}
    </section>
  );
}
