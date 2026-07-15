import { createHash } from 'node:crypto';
import { copyFile, link, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { ManualReviewTriageProgress, ManualReviewTriageRecord } from './manualReviewTriage.ts';
import type { ManualOverrides, MatchRecord, ReuseDecision } from './types.ts';

export const LOCAL_STORAGE_KEY = 'musclemap-fitness:free-exercise-db-manual-review:v0.3';

export interface ManualReviewUserState {
  accepted: Record<string, string>;
  forced: Record<string, string>;
  reuse: Record<string, ReuseDecision>;
  rejected: Record<string, string[]>;
  notes: Record<string, string>;
  skipped: string[];
  filters: Record<string, unknown>;
  currentExerciseId: string | null;
  updatedAt: string | null;
}

export interface ManualReviewPageCandidate {
  sourceId: string;
  sourceName: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  confidence: number;
  scores: {
    name: number;
    equipment: number;
    primaryMuscle: number;
    secondaryMuscle: number;
    attributes: number;
    conflictPenalty: number;
  };
  keyMatches: string[];
  keyDifferences: string[];
  conflicts: Array<{ code: string; message: string }>;
  startPath: string;
  peakPath: string;
}

export interface ManualReviewPageRecord {
  exerciseId: string;
  exercise: MatchRecord['exercise'];
  confidence: number;
  candidates: ManualReviewPageCandidate[];
  codexReviewed: boolean;
  proposal: ManualReviewTriageRecord | null;
  defaultSourceId: string | null;
}

export interface ManualReviewPageModel {
  version: 3;
  generatedAt: string;
  total: number;
  codexProposedCount: number;
  unreviewedByCodexCount: number;
  records: ManualReviewPageRecord[];
  formalOverrides: ManualOverrides;
}

export interface ManualReviewAssetsManifest {
  version: 1;
  generatedAt: string;
  cacheRoot: string;
  outputRoot: string;
  uniqueSourceCount: number;
  imageCount: number;
  mode: 'hard-link' | 'copy' | 'mixed' | 'reused';
  additionalBytes: number;
  sources: Record<string, { exerciseId: string; stages: Record<'start' | 'peak', { sourceFile: string; outputFile: string; mode: 'hard-link' | 'copy' | 'reused'; bytes: number }> }>;
}

export function buildManualReviewPageModel(matches: MatchRecord[], progress: ManualReviewTriageProgress, formalOverrides: ManualOverrides): ManualReviewPageModel {
  const records = matches.filter((item) => item.tier === 'manual-review' && item.exercise.mediaStatus !== 'complete' && !formalOverrides.accepted[item.exercise.exerciseId] && !formalOverrides.forced[item.exercise.exerciseId] && !formalOverrides.reuse[item.exercise.exerciseId]).map((item): ManualReviewPageRecord => {
    const proposal = progress.records[item.exercise.exerciseId] ?? null;
    const candidates = item.topCandidates.slice(0, 3).map((candidate): ManualReviewPageCandidate => ({
      sourceId: candidate.sourceId,
      sourceName: candidate.sourceName,
      equipment: candidate.sourceEquipment,
      primaryMuscles: [...candidate.sourcePrimaryMuscles],
      secondaryMuscles: [...candidate.sourceSecondaryMuscles],
      confidence: candidate.score.finalConfidence,
      scores: {
        name: candidate.score.nameScore,
        equipment: candidate.score.equipmentScore,
        primaryMuscle: candidate.score.primaryMuscleScore,
        secondaryMuscle: candidate.score.secondaryMuscleScore,
        attributes: candidate.score.attributeScore,
        conflictPenalty: candidate.score.conflictPenalty
      },
      keyMatches: [...candidate.score.keyMatches],
      keyDifferences: [...candidate.score.keyDifferences],
      conflicts: candidate.score.conflicts.map(({ code, message }) => ({ code, message })),
      startPath: `manual-review-assets/${encodeURIComponent(candidate.sourceId)}/0.jpg`,
      peakPath: `manual-review-assets/${encodeURIComponent(candidate.sourceId)}/1.jpg`
    }));
    const proposedCandidateExists = Boolean(proposal?.sourceId && candidates.some(({ sourceId }) => sourceId === proposal.sourceId));
    return {
      exerciseId: item.exercise.exerciseId,
      exercise: structuredClone(item.exercise),
      confidence: item.confidence,
      candidates,
      codexReviewed: Boolean(proposal),
      proposal: proposal ? structuredClone(proposal) : null,
      defaultSourceId: proposedCandidateExists ? proposal!.sourceId : candidates[0]?.sourceId ?? null
    };
  }).sort((left, right) => Number(right.codexReviewed) - Number(left.codexReviewed) || right.confidence - left.confidence || left.exerciseId.localeCompare(right.exerciseId));
  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    total: records.length,
    codexProposedCount: records.filter(({ codexReviewed }) => codexReviewed).length,
    unreviewedByCodexCount: records.filter(({ codexReviewed }) => !codexReviewed).length,
    records,
    formalOverrides: structuredClone(formalOverrides)
  };
}

export function mergeManualReviewExport(base: ManualOverrides, state: ManualReviewUserState): ManualOverrides {
  const result = structuredClone(base);
  for (const [exerciseId, sourceId] of Object.entries(state.accepted)) {
    delete result.forced[exerciseId];
    delete result.reuse[exerciseId];
    result.accepted[exerciseId] = sourceId;
  }
  for (const [exerciseId, sourceId] of Object.entries(state.forced)) {
    if (state.accepted[exerciseId]) continue;
    delete result.accepted[exerciseId];
    delete result.reuse[exerciseId];
    result.forced[exerciseId] = sourceId;
  }
  for (const [exerciseId, reuse] of Object.entries(state.reuse)) {
    if (state.accepted[exerciseId] || state.forced[exerciseId]) continue;
    delete result.accepted[exerciseId];
    delete result.forced[exerciseId];
    result.reuse[exerciseId] = structuredClone(reuse);
  }
  for (const [exerciseId, sourceIds] of Object.entries(state.rejected)) {
    result.rejected[exerciseId] = [...new Set([...(result.rejected[exerciseId] ?? []), ...sourceIds])].sort();
  }
  Object.assign(result.notes, state.notes);
  result.updatedAt = new Date().toISOString();
  return result;
}

export async function materializeManualReviewAssets(records: ManualReviewPageRecord[], cacheRoot: string, outputRoot: string): Promise<ManualReviewAssetsManifest> {
  await mkdir(outputRoot, { recursive: true });
  const sourceExercise = new Map<string, string>();
  for (const record of records) for (const candidate of record.candidates) if (!sourceExercise.has(candidate.sourceId)) sourceExercise.set(candidate.sourceId, record.exerciseId);
  const sources: ManualReviewAssetsManifest['sources'] = {};
  const modes = new Set<'hard-link' | 'copy' | 'reused'>();
  let additionalBytes = 0;
  for (const [sourceId, exerciseId] of [...sourceExercise.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const outputDirectory = path.join(outputRoot, sourceId);
    await mkdir(outputDirectory, { recursive: true });
    const stages = {} as ManualReviewAssetsManifest['sources'][string]['stages'];
    for (const [stage, fileName] of [['start', '0.jpg'], ['peak', '1.jpg']] as const) {
      const sourceFile = path.join(cacheRoot, exerciseId, sourceId, fileName);
      const outputFile = path.join(outputDirectory, fileName);
      const sourceBytes = await readFile(sourceFile);
      let mode: 'hard-link' | 'copy' | 'reused';
      try {
        const outputBytes = await readFile(outputFile);
        if (sha256(outputBytes) !== sha256(sourceBytes)) throw new Error(`现有审核资产与缓存不一致: ${outputFile}`);
        mode = 'reused';
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code && (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        try {
          await link(sourceFile, outputFile);
          mode = 'hard-link';
        } catch (linkError) {
          const code = (linkError as NodeJS.ErrnoException).code;
          if (!['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP'].includes(code ?? '')) throw linkError;
          await copyFile(sourceFile, outputFile);
          mode = 'copy';
          additionalBytes += sourceBytes.length;
        }
      }
      modes.add(mode);
      stages[stage] = { sourceFile, outputFile, mode, bytes: (await stat(outputFile)).size };
    }
    sources[sourceId] = { exerciseId, stages };
  }
  const effectiveModes = [...modes].filter((mode) => mode !== 'reused');
  const mode: ManualReviewAssetsManifest['mode'] = effectiveModes.length === 0 ? 'reused' : effectiveModes.length === 1 ? effectiveModes[0] : 'mixed';
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    cacheRoot,
    outputRoot,
    uniqueSourceCount: sourceExercise.size,
    imageCount: sourceExercise.size * 2,
    mode,
    additionalBytes,
    sources
  };
}

export function createManualReviewPageHtml(model: ManualReviewPageModel, contactSheets: string[]) {
  const payload = jsonForHtml({ model, contactSheets, storageKey: LOCAL_STORAGE_KEY });
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Free Exercise DB 人工审核 V0.3</title><style>
  :root{font-family:Inter,"Microsoft YaHei",system-ui,sans-serif;color:#172033;background:#edf0f4;--line:#cbd2dd;--muted:#5d6879;--blue:#3157c8;--green:#19704f;--orange:#a85a12;--red:#a6343f}*{box-sizing:border-box}body{margin:0;min-width:980px}button,input,select,textarea{font:inherit}.top{position:sticky;top:0;z-index:10;background:#172033;color:white;padding:12px 20px}.topline,.actions,.nav,.quick,.sheet-links{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.topline{justify-content:space-between}.stats{display:grid;grid-template-columns:repeat(10,minmax(80px,1fr));gap:1px;margin-top:10px;background:#455167}.stat{background:#243048;padding:7px 9px}.stat b{display:block;font-size:1rem}.stat span{font-size:.65rem;color:#cbd3df}.page{max-width:1680px;margin:auto;padding:14px 20px 28px}.toolbar,.card,.contacts{background:#fff;border:1px solid var(--line);border-radius:12px}.toolbar{padding:11px;margin-bottom:12px}.filters{display:grid;grid-template-columns:repeat(6,minmax(130px,1fr));gap:8px}.field{display:grid;gap:3px;font-size:.68rem;color:var(--muted);font-weight:700}.field input,.field select,.field textarea{min-height:36px;border:1px solid #b8c1cf;border-radius:7px;padding:6px 8px;background:#fff}.quick{margin-top:8px}.btn{border:1px solid #aeb8c8;border-radius:8px;background:#fff;color:#24334a;padding:7px 10px;cursor:pointer;font-size:.76rem;font-weight:700}.btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}.btn.accept{background:var(--green);border-color:var(--green);color:#fff}.btn.force{border-color:var(--orange);color:#7e4009}.btn.reject{border-color:#d4a1a6;color:#8e2832}.btn:disabled{opacity:.45;cursor:not-allowed}.contacts{padding:10px;margin-bottom:12px;font-size:.75rem}.contacts summary{cursor:pointer;font-weight:750}.sheet-links{margin-top:8px}.card{overflow:hidden}.record-head{display:grid;grid-template-columns:1.25fr .9fr 1fr;gap:16px;padding:16px}.record-head h1{margin:0 0 4px;font-size:1.25rem}.muted{color:var(--muted);font-size:.76rem;line-height:1.5}.badge{display:inline-block;border-radius:999px;padding:4px 8px;font-size:.68rem;font-weight:800;background:#e8edf7}.badge.codex{background:#e6f3ed;color:#176445}.badge.pending{background:#fff1dd;color:#8b5515}.proposal{padding:10px;border-radius:9px;background:#f4f7fb;font-size:.75rem;line-height:1.5}.proposal b{display:block;margin-bottom:4px}.candidates{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.candidate{border:0;background:#fafbfc;text-align:left;padding:12px;min-width:0;cursor:pointer;color:inherit}.candidate.selected{outline:4px solid var(--blue);outline-offset:-4px;background:#f1f5ff}.candidate.rejected{opacity:.45}.candidate h2{font-size:.86rem;margin:0 0 3px}.candidate .meta{font-size:.68rem;color:var(--muted);line-height:1.4}.images{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.image{background:#e9edf3;min-height:270px;position:relative;display:grid;place-items:center;overflow:hidden;border-radius:7px}.image img{width:100%;height:270px;object-fit:contain;background:#fff}.image .fallback{display:none;padding:10px;text-align:center;font-size:.68rem;color:#7d3940;word-break:break-all}.scores{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;font-size:.64rem}.score{display:flex;justify-content:space-between;background:#edf0f5;padding:3px 5px;border-radius:5px}.signals{font-size:.67rem;line-height:1.45;margin-top:7px}.conflict{color:#922e38}.decision-panel{display:grid;grid-template-columns:1.35fr .65fr;gap:14px;padding:14px}.decision-panel textarea{width:100%;min-height:74px;border:1px solid #b8c1cf;border-radius:8px;padding:8px}.status{font-size:.76rem;color:var(--muted);margin-bottom:8px}.nav{justify-content:space-between;margin-top:12px}.empty{padding:70px;text-align:center;color:var(--muted)}dialog{border:0;border-radius:12px;padding:0;max-width:520px;width:90%}dialog::backdrop{background:#101827aa}.dialog{padding:18px}.dialog .field{margin:8px 0}.toast{position:fixed;right:20px;bottom:20px;background:#172033;color:white;padding:10px 13px;border-radius:8px;opacity:0;pointer-events:none}.toast.show{opacity:1}@media(max-width:1150px){.stats{grid-template-columns:repeat(5,1fr)}.filters{grid-template-columns:repeat(3,1fr)}.candidates{grid-template-columns:1fr}.image img{height:360px}.record-head,.decision-panel{grid-template-columns:1fr}}
  </style></head><body><header class="top"><div class="topline"><div><b>Free Exercise DB 人工审核 V0.3</b><div id="position" class="muted"></div></div><div class="actions"><button class="btn" id="import-session">导入已有审核进度</button><input type="file" id="import-file" accept="application/json,.json" hidden><button class="btn" id="export-session">导出 manual-review-session.json</button><button class="btn primary" id="export-overrides">导出 manual-overrides.json</button><button class="btn reject" id="clear-state">清空浏览器审核状态</button></div></div><div class="stats" id="stats"></div></header><main class="page"><details class="contacts"><summary>打开联系表目录 · 已有 ${contactSheets.length} 张</summary><div class="sheet-links"><a class="btn" target="_blank" href="manual-review-contact-sheets/">打开联系表目录</a>${contactSheets.map((sheet, index) => `<a class="btn" target="_blank" href="${escapeHtml(sheet)}">批次 ${index + 1}</a>`).join('')}</div></details><section class="toolbar"><div class="filters"><label class="field">提案状态<select id="proposal-filter"><option value="">全部</option><option value="codex">Codex已提案</option><option value="pending">尚未复核</option><option value="proposed-accepted">proposed-accepted</option><option value="proposed-forced">proposed-forced</option><option value="proposed-reuse">proposed-reuse</option><option value="proposed-rejected">proposed-rejected</option><option value="unresolved">unresolved</option></select></label><label class="field">用户审核状态<select id="user-filter"><option value="">全部</option><option value="unreviewed" selected>未审核</option><option value="accepted">已接受</option><option value="forced">已强制</option><option value="reuse">已共图</option><option value="rejected-all">已拒绝全部候选</option><option value="skipped">已跳过</option></select></label><label class="field">器械<select id="equipment-filter"><option value="">全部</option></select></label><label class="field">肌群<select id="muscle-filter"><option value="">全部</option></select></label><label class="field">最低 confidence<input id="confidence-min" type="number" min="0" max="1" step="0.01" placeholder="0"></label><label class="field">最高 confidence<input id="confidence-max" type="number" min="0" max="1" step="0.01" placeholder="1"></label><label class="field">硬冲突<select id="conflict-filter"><option value="">全部</option><option value="yes">有硬冲突</option><option value="no">无硬冲突</option></select></label><label class="field" style="grid-column:span 3">exerciseId / 中文名 / 英文名<input id="query-filter" placeholder="搜索动作"></label><label class="field">跳转到 exerciseId<input id="jump-id" list="exercise-ids"><datalist id="exercise-ids"></datalist></label></div><div class="quick"><button class="btn" data-quick="codex">只看Codex已提案</button><button class="btn" data-quick="pending">只看剩余70条</button><button class="btn" data-quick="unreviewed">只看未审核</button><button class="btn" data-quick="no-conflict">只看无硬冲突</button><button class="btn" data-quick="clear">清空筛选</button></div></section><section class="card" id="record-root"></section><div class="nav"><div><button class="btn" id="previous">上一条</button><button class="btn" id="next">下一条</button></div><div><button class="btn" id="first-unreviewed">第一条未审核</button><button class="btn primary" id="next-unreviewed">下一条未审核</button></div></div></main><dialog id="reuse-dialog"><form method="dialog" class="dialog"><h2>标记共图</h2><label class="field">baseExerciseId<input id="reuse-base" required></label><label class="field">sourceId<input id="reuse-source" required></label><label class="field">reason<textarea id="reuse-reason" required></textarea></label><label class="field">differences<textarea id="reuse-differences" required></textarea></label><div class="actions"><button class="btn" value="cancel">取消</button><button class="btn primary" id="save-reuse" value="default">保存共图</button></div></form></dialog><div class="toast" id="toast"></div><script>
  const payload=${payload};const STORAGE_KEY=payload.storageKey;const records=payload.model.records;const byId=Object.fromEntries(records.map(x=>[x.exerciseId,x]));let selected={};let currentId=null;
  const blankState=()=>({accepted:{},forced:{},reuse:{},rejected:{},notes:{},skipped:[],filters:{proposal:'',user:'unreviewed',equipment:'',muscle:'',min:'',max:'',conflict:'',query:''},currentExerciseId:null,updatedAt:null});
  function sanitize(raw){const clean=blankState();if(!raw||typeof raw!=='object')return clean;for(const key of ['accepted','forced','reuse','rejected','notes'])if(raw[key]&&typeof raw[key]==='object')clean[key]=raw[key];clean.skipped=Array.isArray(raw.skipped)?[...new Set(raw.skipped.filter(id=>byId[id]))]:[];clean.filters={...clean.filters,...(raw.filters||{})};clean.currentExerciseId=byId[raw.currentExerciseId]?raw.currentExerciseId:null;clean.updatedAt=typeof raw.updatedAt==='string'?raw.updatedAt:null;for(const id of Object.keys(clean.accepted)){delete clean.forced[id];delete clean.reuse[id]}for(const id of Object.keys(clean.forced))delete clean.reuse[id];return clean}
  function loadState(){try{return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{return blankState()}}const state=loadState();currentId=state.currentExerciseId||records[0]?.exerciseId||null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const uniq=v=>[...new Set(v)].sort((a,b)=>String(a).localeCompare(String(b),'zh-CN'));
  function persist(){state.currentExerciseId=currentId;state.updatedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderStats()}
  function selectedSource(item){const allowed=item.candidates.filter(c=>!(state.rejected[item.exerciseId]||[]).includes(c.sourceId));const preferred=selected[item.exerciseId]||state.accepted[item.exerciseId]||state.forced[item.exerciseId]||state.reuse[item.exerciseId]?.sourceId||item.defaultSourceId;return allowed.find(c=>c.sourceId===preferred)||allowed[0]||item.candidates[0]||null}
  function userStatus(item){const id=item.exerciseId;if(state.accepted[id])return'accepted';if(state.forced[id])return'forced';if(state.reuse[id])return'reuse';if(item.candidates.length&&(state.rejected[id]||[]).length>=item.candidates.length)return'rejected-all';if(state.skipped.includes(id))return'skipped';return'unreviewed'}
  function proposalStatus(item){return item.codexReviewed?item.proposal.decision:'pending'}
  function hasConflict(item){return item.candidates.some(c=>c.conflicts.length)}
  function filtered(){const f=state.filters,q=String(f.query||'').trim().toLowerCase(),min=f.min===''?-Infinity:Number(f.min),max=f.max===''?Infinity:Number(f.max);return records.filter(item=>{const proposal=proposalStatus(item),status=userStatus(item),e=item.exercise;return(!f.proposal||(f.proposal==='codex'?item.codexReviewed:f.proposal==='pending'?!item.codexReviewed:proposal===f.proposal))&&(!f.user||status===f.user)&&(!f.equipment||e.equipment.includes(f.equipment))&&(!f.muscle||e.primaryMuscles.includes(f.muscle)||e.secondaryMuscles.includes(f.muscle))&&item.confidence>=min&&item.confidence<=max&&(!f.conflict||(f.conflict==='yes')===hasConflict(item))&&(!q||[item.exerciseId,e.name,e.nameEn].join(' ').toLowerCase().includes(q))})}
  function ensureCurrent(list){if(list.some(x=>x.exerciseId===currentId))return;currentId=(list.find(x=>userStatus(x)==='unreviewed')||list[0]||{}).exerciseId||null}
  function render(){syncFilters();const list=filtered();ensureCurrent(list);renderStats();renderPosition(list);renderRecord(byId[currentId]||null);persistPositionOnly()}
  function persistPositionOnly(){state.currentExerciseId=currentId;state.updatedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  function renderStats(){const counts={accepted:0,forced:0,reuse:0,'rejected-all':0,skipped:0,unreviewed:0};records.forEach(x=>counts[userStatus(x)]++);const list=filtered(),position=Math.max(0,list.findIndex(x=>x.exerciseId===currentId))+1;const values=[['manual-review',payload.model.total],['Codex已提案',payload.model.codexProposedCount],['尚未复核',payload.model.unreviewedByCodexCount],['用户已确认',counts.accepted],['用户已拒绝',counts['rejected-all']],['用户已强制',counts.forced],['用户已共图',counts.reuse],['用户已跳过',counts.skipped],['用户未审核',counts.unreviewed],['当前序号',list.length?position+' / '+list.length:'0 / 0']];document.getElementById('stats').innerHTML=values.map(([label,value])=>'<div class="stat"><b>'+esc(value)+'</b><span>'+esc(label)+'</span></div>').join('')}
  function renderPosition(list){const index=list.findIndex(x=>x.exerciseId===currentId);document.getElementById('position').textContent=list.length?(index+1)+' / '+list.length+' · '+currentId:'0 / 0'}
  function renderRecord(item){const root=document.getElementById('record-root');if(!item){root.innerHTML='<div class="empty">当前筛选没有记录</div>';return}const e=item.exercise,candidate=selectedSource(item),status=userStatus(item),proposal=item.proposal;root.innerHTML='<div class="record-head"><div><span class="badge '+(item.codexReviewed?'codex':'pending')+'">'+(item.codexReviewed?'Codex已复核，仅供参考':'尚未由Codex复核，请用户自行判断')+'</span><h1>'+esc(e.name)+'</h1><div class="muted">'+esc(item.exerciseId)+' · '+esc(e.nameEn)+'<br>器械：'+esc(e.equipment.join(' / ')||'未标注')+'<br>主练：'+esc(e.primaryMuscles.join(' / ')||'未标注')+'<br>次要：'+esc(e.secondaryMuscles.join(' / ')||'未标注')+'</div></div><div class="muted"><b>动作属性</b><br>'+esc([e.category,e.force,e.mechanic,e.laterality].filter(Boolean).join(' / ')||'未标注')+'<br>媒体：'+esc(e.mediaStatus)+'<br>confidence：'+item.confidence.toFixed(3)+'<br>用户状态：'+esc(status)+'</div>'+(proposal?proposalHtml(proposal):'<div class="proposal"><b>原始匹配数据</b>此动作尚未由 Codex 复核；页面不提供任何新建议。</div>')+'</div><div class="candidates">'+item.candidates.map((c,index)=>candidateHtml(item,c,index,candidate)).join('')+'</div><div class="decision-panel"><div><div class="status">当前候选：'+esc(candidate?.sourceId||'无')+'</div><div class="actions"><button class="btn accept" id="accept">接受当前候选</button><button class="btn reject" id="reject">拒绝当前候选</button><button class="btn force" id="force">强制采用当前候选</button><button class="btn" id="reuse">标记共图</button><button class="btn" id="skip">暂时跳过</button><button class="btn primary" id="confirm-proposal" '+(!proposal||proposal.decision==='unresolved'?'disabled':'')+'>确认Codex建议</button></div></div><label class="field">备注<textarea id="note" placeholder="按 exerciseId 自动保存">'+esc(state.notes[item.exerciseId]||'')+'</textarea></label></div>';bindRecord(item,candidate)}
  function proposalHtml(p){return'<div class="proposal"><b>Codex 建议：'+esc(p.decision)+'</b>sourceId：'+esc(p.sourceId||'无')+'<br>confidence：'+Number(p.confidence).toFixed(3)+'<br>视觉证据：'+esc(p.visualEvidence.join('；'))+'<br>元数据证据：'+esc(p.metadataEvidence.join('；'))+'<br>差异：'+esc(p.differences.join('；')||'无')+'<br>风险：'+esc(p.risks.join('；')||'无')+(p.contactSheetPath?'<br><a target="_blank" href="'+esc(p.contactSheetPath)+'">打开对应联系表</a>':'')+'</div>'}
  function candidateHtml(item,c,index,selectedCandidate){const rejected=(state.rejected[item.exerciseId]||[]).includes(c.sourceId);return'<button class="candidate '+(selectedCandidate?.sourceId===c.sourceId?'selected ':'')+(rejected?'rejected':'')+'" data-source="'+esc(c.sourceId)+'"><h2>#'+(index+1)+' '+esc(c.sourceName)+'</h2><div class="meta">'+esc(c.sourceId)+'<br>器械：'+esc(c.equipment||'未标注')+'<br>主练：'+esc(c.primaryMuscles.join(' / ')||'未标注')+'<br>次要：'+esc(c.secondaryMuscles.join(' / ')||'未标注')+'<br>confidence '+c.confidence.toFixed(3)+'</div><div class="images">'+imageHtml('start',c.startPath,c.sourceId)+imageHtml('peak',c.peakPath,c.sourceId)+'</div><div class="scores">'+Object.entries(c.scores).map(([k,v])=>'<span class="score"><span>'+esc(k)+'</span><b>'+Number(v).toFixed(3)+'</b></span>').join('')+'</div><div class="signals"><div>一致：'+esc(c.keyMatches.join('；')||'无')+'</div><div>差异：'+esc(c.keyDifferences.join('；')||'无')+'</div><div class="conflict">冲突：'+esc(c.conflicts.map(x=>x.code+' '+x.message).join('；')||'无')+'</div></div></button>'}
  function imageHtml(label,src,sourceId){return'<div class="image"><img src="'+esc(src)+'" alt="'+esc(sourceId+' '+label)+'" onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;block&quot;"><div class="fallback">图片加载失败<br>'+esc(sourceId)+'<br>'+esc(src)+'</div></div>'}
  function bindRecord(item,candidate){document.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>{selected[item.exerciseId]=button.dataset.source;render()});document.getElementById('accept').onclick=()=>setFinal(item,'accepted',candidate?.sourceId);document.getElementById('force').onclick=()=>setFinal(item,'forced',candidate?.sourceId);document.getElementById('reject').onclick=()=>rejectCandidate(item,candidate?.sourceId);document.getElementById('reuse').onclick=()=>openReuse(item,candidate);document.getElementById('skip').onclick=()=>{state.skipped=uniq([...state.skipped,item.exerciseId]);persist();goNextUnreviewed()};const confirm=document.getElementById('confirm-proposal');if(!confirm.disabled)confirm.onclick=()=>confirmProposal(item);document.getElementById('note').oninput=e=>{state.notes[item.exerciseId]=e.target.value;persist()}}
  function clearFinal(id){delete state.accepted[id];delete state.forced[id];delete state.reuse[id]}
  function setFinal(item,type,sourceId){if(!sourceId)return;clearFinal(item.exerciseId);state[type][item.exerciseId]=sourceId;state.skipped=state.skipped.filter(id=>id!==item.exerciseId);persist();toastMessage(type+' '+sourceId);goNextUnreviewed()}
  function rejectCandidate(item,sourceId){if(!sourceId)return;clearFinal(item.exerciseId);state.rejected[item.exerciseId]=uniq([...(state.rejected[item.exerciseId]||[]),sourceId]);delete selected[item.exerciseId];persist();render()}
  function openReuse(item,candidate){if(!candidate)return;document.getElementById('reuse-base').value=state.reuse[item.exerciseId]?.baseExerciseId||'';document.getElementById('reuse-source').value=candidate.sourceId;document.getElementById('reuse-reason').value=state.reuse[item.exerciseId]?.reason||'';document.getElementById('reuse-differences').value=state.reuse[item.exerciseId]?.differences||'';document.getElementById('reuse-dialog').showModal();document.getElementById('save-reuse').onclick=e=>{e.preventDefault();const value={baseExerciseId:document.getElementById('reuse-base').value.trim(),sourceId:document.getElementById('reuse-source').value.trim(),reason:document.getElementById('reuse-reason').value.trim(),differences:document.getElementById('reuse-differences').value.trim()};if(!value.baseExerciseId||!value.sourceId||!value.reason||!value.differences)return;clearFinal(item.exerciseId);state.reuse[item.exerciseId]=value;state.skipped=state.skipped.filter(id=>id!==item.exerciseId);document.getElementById('reuse-dialog').close();persist();goNextUnreviewed()}}
  function confirmProposal(item){const p=item.proposal;if(!p||p.decision==='unresolved')return;if(p.decision==='proposed-accepted')return setFinal(item,'accepted',p.sourceId);if(p.decision==='proposed-forced')return setFinal(item,'forced',p.sourceId);if(p.decision==='proposed-reuse'){clearFinal(item.exerciseId);state.reuse[item.exerciseId]={baseExerciseId:p.baseExerciseId,sourceId:p.sourceId,reason:p.visualEvidence.join('；')||'确认 Codex 共图建议',differences:p.differences.join('；')||'轻微变式'};persist();return goNextUnreviewed()}if(p.decision==='proposed-rejected'){clearFinal(item.exerciseId);state.rejected[item.exerciseId]=uniq([...(state.rejected[item.exerciseId]||[]),...(p.rejectedSourceIds||[]),...(p.sourceId?[p.sourceId]:[])]);persist();render()}}
  function move(delta){const list=filtered();if(!list.length)return;const index=Math.max(0,list.findIndex(x=>x.exerciseId===currentId));currentId=list[(index+delta+list.length)%list.length].exerciseId;render()}
  function goNextUnreviewed(){const list=filtered(),start=Math.max(-1,list.findIndex(x=>x.exerciseId===currentId));for(let offset=1;offset<=list.length;offset++){const item=list[(start+offset+list.length)%list.length];if(item&&userStatus(item)==='unreviewed'){currentId=item.exerciseId;render();return}}render()}
  function goFirstUnreviewed(){const item=filtered().find(x=>userStatus(x)==='unreviewed');if(item){currentId=item.exerciseId;render()}}
  function syncFilters(){const f=state.filters;document.getElementById('proposal-filter').value=f.proposal||'';document.getElementById('user-filter').value=f.user||'';document.getElementById('equipment-filter').value=f.equipment||'';document.getElementById('muscle-filter').value=f.muscle||'';document.getElementById('confidence-min').value=f.min||'';document.getElementById('confidence-max').value=f.max||'';document.getElementById('conflict-filter').value=f.conflict||'';document.getElementById('query-filter').value=f.query||''}
  function bindFilters(){const map={proposal:'proposal-filter',user:'user-filter',equipment:'equipment-filter',muscle:'muscle-filter',min:'confidence-min',max:'confidence-max',conflict:'conflict-filter',query:'query-filter'};for(const[key,id]of Object.entries(map))document.getElementById(id).addEventListener('input',e=>{state.filters[key]=e.target.value;persist();render()});document.querySelectorAll('[data-quick]').forEach(button=>button.onclick=()=>{const q=button.dataset.quick;if(q==='codex')state.filters={...blankState().filters,proposal:'codex'};if(q==='pending')state.filters={...blankState().filters,proposal:'pending'};if(q==='unreviewed')state.filters={...blankState().filters,user:'unreviewed'};if(q==='no-conflict')state.filters={...blankState().filters,conflict:'no'};if(q==='clear')state.filters={...blankState().filters,user:''};persist();render()})}
  function mergeExport(){const result=JSON.parse(JSON.stringify(payload.model.formalOverrides));for(const[id,source]of Object.entries(state.accepted)){delete result.forced[id];delete result.reuse[id];result.accepted[id]=source}for(const[id,source]of Object.entries(state.forced)){if(state.accepted[id])continue;delete result.accepted[id];delete result.reuse[id];result.forced[id]=source}for(const[id,value]of Object.entries(state.reuse)){if(state.accepted[id]||state.forced[id])continue;delete result.accepted[id];delete result.forced[id];result.reuse[id]=value}for(const[id,values]of Object.entries(state.rejected))result.rejected[id]=uniq([...(result.rejected[id]||[]),...values]);Object.assign(result.notes,state.notes);result.updatedAt=new Date().toISOString();return result}
  function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
  function exportOverrides(){const merged=mergeExport(),unreviewed=records.filter(x=>userStatus(x)==='unreviewed').length,message='导出摘要\\n原有 accepted：'+Object.keys(payload.model.formalOverrides.accepted).length+'\\n本次新增 accepted：'+Object.keys(state.accepted).length+'\\n本次新增 forced：'+Object.keys(state.forced).length+'\\n本次新增 reuse：'+Object.keys(state.reuse).length+'\\nrejected 动作：'+Object.keys(state.rejected).length+'\\n尚未审核：'+unreviewed;if(confirm(message+'\\n\\n确认导出 manual-overrides.json？'))download('manual-overrides.json',merged)}
  function exportSession(){download('manual-review-session.json',{version:3,exportedAt:new Date().toISOString(),storageKey:STORAGE_KEY,state,proposalReferences:Object.fromEntries(records.filter(x=>x.proposal).map(x=>[x.exerciseId,{decision:x.proposal.decision,updatedAt:x.proposal.updatedAt}])),stats:{total:records.length,codexProposed:payload.model.codexProposedCount,unreviewedByCodex:payload.model.unreviewedByCodexCount}})}
  function populateOptions(){const equipment=uniq(records.flatMap(x=>x.exercise.equipment)),muscles=uniq(records.flatMap(x=>[...x.exercise.primaryMuscles,...x.exercise.secondaryMuscles]));document.getElementById('equipment-filter').innerHTML='<option value="">全部</option>'+equipment.map(x=>'<option>'+esc(x)+'</option>').join('');document.getElementById('muscle-filter').innerHTML='<option value="">全部</option>'+muscles.map(x=>'<option>'+esc(x)+'</option>').join('');document.getElementById('exercise-ids').innerHTML=records.map(x=>'<option value="'+esc(x.exerciseId)+'">').join('')}
  function toastMessage(value){const t=document.getElementById('toast');t.textContent=value;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1200)}
  populateOptions();bindFilters();document.getElementById('previous').onclick=()=>move(-1);document.getElementById('next').onclick=()=>move(1);document.getElementById('next-unreviewed').onclick=goNextUnreviewed;document.getElementById('first-unreviewed').onclick=goFirstUnreviewed;document.getElementById('jump-id').onchange=e=>{if(byId[e.target.value]){currentId=e.target.value;render()}};document.getElementById('export-overrides').onclick=exportOverrides;document.getElementById('export-session').onclick=exportSession;document.getElementById('import-session').onclick=()=>document.getElementById('import-file').click();document.getElementById('import-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),next=sanitize(parsed.state||parsed);Object.assign(state,next);currentId=state.currentExerciseId||records[0]?.exerciseId;persist();render();toastMessage('审核进度已导入')}catch(error){alert('导入失败：'+error.message)}e.target.value=''};document.getElementById('clear-state').onclick=()=>{if(confirm('确定清空浏览器中的 V0.3 审核状态吗？此操作不会修改正式文件。')){localStorage.removeItem(STORAGE_KEY);location.reload()}};addEventListener('keydown',e=>{const tag=e.target?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||e.target?.isContentEditable)return;const item=byId[currentId],candidate=item&&selectedSource(item);if(e.key==='a'||e.key==='A')setFinal(item,'accepted',candidate?.sourceId);if(e.key==='r'||e.key==='R')rejectCandidate(item,candidate?.sourceId);if(e.key==='f'||e.key==='F')setFinal(item,'forced',candidate?.sourceId);if(e.key==='g'||e.key==='G')openReuse(item,candidate);if(e.key==='s'||e.key==='S'){state.skipped=uniq([...state.skipped,item.exerciseId]);persist();goNextUnreviewed()}if(e.key==='c'||e.key==='C')confirmProposal(item);if(e.key==='j'||e.key==='J'||e.key==='ArrowRight')move(1);if(e.key==='k'||e.key==='K'||e.key==='ArrowLeft')move(-1);if(['1','2','3'].includes(e.key)&&item?.candidates[Number(e.key)-1]){selected[item.exerciseId]=item.candidates[Number(e.key)-1].sourceId;render()}if(e.key==='e'||e.key==='E')exportOverrides()});render();
  </script></body></html>`;
}

function sha256(value: Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

function jsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}
