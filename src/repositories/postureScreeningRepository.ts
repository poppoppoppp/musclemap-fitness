import type { NormalizedPoint, PostureLandmarkId, PosturePhotoView } from '../utils/posturePhotogrammetry';
import type { PostureScreeningInput, PostureScreeningResult } from '../utils/postureScreeningRules';

export const POSTURE_SCREENING_SESSIONS_KEY = 'musclemap.postureScreeningSessions.v1';
export const POSTURE_SCREENING_DRAFT_KEY = 'musclemap.postureScreeningDraft.v1';
export const DEFAULT_POSTURE_SCREENING_DB_NAME = 'musclemap-posture-screening-v1';

const PHOTO_ASSET_STORE = 'photo-assets';
const PHOTO_BLOB_STORE = 'photo-blobs';

export type PostureScreeningDraftStep = 'boundary' | 'safety' | 'concern' | 'follow-up' | 'movement' | 'photo' | 'review';

export interface PostureScreeningContext {
  planId?: string;
  baselineSessionId?: string;
}

export interface PostureMeasurementSnapshot {
  metricId: string;
  value: number;
  unit: 'deg' | 'ratio';
  evidenceIds: string[];
}

export interface PosturePhotoMeasurementSnapshot {
  view: PosturePhotoView;
  protocolVersion?: 'posture-photo-standard-v1';
  photoAssetId?: string;
  photoAssetAvailable: boolean;
  landmarks: Partial<Record<PostureLandmarkId, NormalizedPoint>>;
  measurements: PostureMeasurementSnapshot[];
  quality: 'valid' | 'invalid';
}

export interface PostureScreeningDraft {
  id: string;
  currentStep: PostureScreeningDraftStep;
  answers: Partial<PostureScreeningInput>;
  photoMeasurements: PosturePhotoMeasurementSnapshot[];
  context?: PostureScreeningContext;
  createdAt: string;
  updatedAt: string;
}

export type PostureScreeningDraftInput = Pick<PostureScreeningDraft, 'currentStep' | 'answers' | 'photoMeasurements' | 'context'>;

export interface PostureScreeningSession {
  id: string;
  status: PostureScreeningResult['status'];
  input: PostureScreeningInput;
  result: PostureScreeningResult;
  photoMeasurements: PosturePhotoMeasurementSnapshot[];
  context?: PostureScreeningContext;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
}

export type PostureScreeningSessionInput = Pick<PostureScreeningSession, 'input' | 'result' | 'photoMeasurements' | 'context'>;

export interface PosturePhotoAsset {
  id: string;
  ownerId: string;
  view: PosturePhotoView;
  blobId: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface SavePosturePhotoAssetInput {
  ownerId: string;
  view: PosturePhotoView;
  blob: Blob;
  width: number;
  height: number;
}

type ReadResult<T> = { ok: true; value: T } | { ok: false; error: 'damaged-storage'; value: T };
type WriteError = 'storage-failed' | 'damaged-storage';
type SaveDraftResult = { ok: true; draft: PostureScreeningDraft } | { ok: false; error: WriteError };
type SaveSessionResult = { ok: true; session: PostureScreeningSession } | { ok: false; error: WriteError };
type DiscardDraftResult = { ok: true } | { ok: false; error: WriteError };
type DeleteResult = { ok: true } | { ok: false; error: 'session-not-found' | 'photo-not-found' | 'storage-failed' | 'damaged-storage' };
type SavePhotoResult = { ok: true; asset: PosturePhotoAsset } | { ok: false; error: 'invalid-photo' | 'storage-failed' };

export class PostureScreeningRepository {
  constructor(
    private readonly storage: Storage,
    private readonly factory: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB,
    private readonly databaseName = DEFAULT_POSTURE_SCREENING_DB_NAME,
    private readonly now: () => Date = () => new Date(),
  ) {}

  readDraft(): ReadResult<PostureScreeningDraft | null> {
    const raw = this.storage.getItem(POSTURE_SCREENING_DRAFT_KEY);
    if (raw === null) return { ok: true, value: null };
    const parsed = parseJson(raw);
    const draft = normalizePostureScreeningDraft(parsed);
    return draft ? { ok: true, value: clone(draft) } : { ok: false, error: 'damaged-storage', value: null };
  }

  saveDraft(input: PostureScreeningDraftInput): SaveDraftResult {
    const existing = this.readDraft();
    if (!existing.ok) return { ok: false, error: 'damaged-storage' };
    const timestamp = this.now().toISOString();
    const draft: PostureScreeningDraft = clone({
      ...input,
      id: existing.value?.id ?? createId('posture-screening-draft', timestamp),
      createdAt: existing.value?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    try {
      this.storage.setItem(POSTURE_SCREENING_DRAFT_KEY, JSON.stringify(draft));
      return { ok: true, draft: clone(draft) };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  clearDraft(): { ok: true } | { ok: false; error: 'storage-failed' } {
    try {
      this.storage.removeItem(POSTURE_SCREENING_DRAFT_KEY);
      return { ok: true };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  async discardDraft(): Promise<DiscardDraftResult> {
    const existing = this.readDraft();
    if (!existing.ok) return { ok: false, error: 'damaged-storage' };
    if (existing.value) {
      const assetIds = unique(existing.value.photoMeasurements.flatMap(({ photoAssetId }) => photoAssetId ? [photoAssetId] : []));
      for (const assetId of assetIds) {
        if (!(await this.deletePhotoAsset(assetId))) return { ok: false, error: 'storage-failed' };
      }
    }
    return this.clearDraft();
  }

  readSessions(): ReadResult<PostureScreeningSession[]> {
    const raw = this.storage.getItem(POSTURE_SCREENING_SESSIONS_KEY);
    if (raw === null) return { ok: true, value: [] };
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) return { ok: false, error: 'damaged-storage', value: [] };
    const sessions = parsed.map(normalizePostureScreeningSession);
    if (sessions.some((session) => session === null)) return { ok: false, error: 'damaged-storage', value: [] };
    const normalized = sessions.filter((session): session is PostureScreeningSession => session !== null)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
    return { ok: true, value: clone(normalized) };
  }

  getSession(id: string): PostureScreeningSession | null {
    const result = this.readSessions();
    return result.ok ? result.value.find((session) => session.id === id) ?? null : null;
  }

  saveSession(input: PostureScreeningSessionInput): SaveSessionResult {
    const existing = this.readSessions();
    if (!existing.ok) return { ok: false, error: 'damaged-storage' };
    const timestamp = this.now().toISOString();
    const session: PostureScreeningSession = clone({
      ...input,
      id: createId('posture-screening-session', timestamp),
      status: input.result.status,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
    });
    try {
      this.storage.setItem(POSTURE_SCREENING_SESSIONS_KEY, JSON.stringify([...existing.value, session]));
      return { ok: true, session: clone(session) };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  async savePhotoAsset(input: SavePosturePhotoAssetInput): Promise<SavePhotoResult> {
    if (!input.ownerId || (input.view !== 'front' && input.view !== 'left-lateral') || !(input.blob instanceof Blob) || !isPositiveNumber(input.width) || !isPositiveNumber(input.height)) {
      return { ok: false, error: 'invalid-photo' };
    }
    const timestamp = this.now().toISOString();
    const asset: PosturePhotoAsset = {
      id: createId('posture-photo', timestamp),
      ownerId: input.ownerId,
      view: input.view,
      blobId: createId('posture-photo-blob', timestamp),
      width: input.width,
      height: input.height,
      createdAt: timestamp,
    };
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction([PHOTO_ASSET_STORE, PHOTO_BLOB_STORE], 'readwrite');
      transaction.objectStore(PHOTO_ASSET_STORE).put(asset);
      transaction.objectStore(PHOTO_BLOB_STORE).put({ id: asset.blobId, blob: input.blob });
      await transactionDone(transaction);
      database.close();
      return { ok: true, asset };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  async readPhotoBlob(assetId: string): Promise<{ ok: true; value: Blob | null } | { ok: false; error: 'storage-failed'; value: null }> {
    try {
      const database = await this.openDatabase();
      const assetTransaction = database.transaction(PHOTO_ASSET_STORE, 'readonly');
      const asset = await request<PosturePhotoAsset | undefined>(assetTransaction.objectStore(PHOTO_ASSET_STORE).get(assetId));
      await transactionDone(assetTransaction);
      if (!asset) {
        database.close();
        return { ok: true, value: null };
      }
      const blobTransaction = database.transaction(PHOTO_BLOB_STORE, 'readonly');
      const value = await request<{ id: string; blob: Blob } | undefined>(blobTransaction.objectStore(PHOTO_BLOB_STORE).get(asset.blobId));
      await transactionDone(blobTransaction);
      database.close();
      return { ok: true, value: value?.blob ?? null };
    } catch {
      return { ok: false, error: 'storage-failed', value: null };
    }
  }

  async getPhotoBlob(assetId: string): Promise<Blob | null> {
    const result = await this.readPhotoBlob(assetId);
    return result.value;
  }

  async deleteSessionPhoto(sessionId: string, assetId: string): Promise<DeleteResult> {
    const sessions = this.readSessions();
    if (!sessions.ok) return { ok: false, error: 'damaged-storage' };
    const session = sessions.value.find(({ id }) => id === sessionId);
    if (!session) return { ok: false, error: 'session-not-found' };
    if (!session.photoMeasurements.some(({ photoAssetId }) => photoAssetId === assetId)) return { ok: false, error: 'photo-not-found' };
    if (!(await this.deletePhotoAsset(assetId))) return { ok: false, error: 'storage-failed' };

    const updated: PostureScreeningSession = {
      ...session,
      photoMeasurements: session.photoMeasurements.map((photo) => {
        if (photo.photoAssetId !== assetId) return photo;
        const { photoAssetId: _removed, ...retained } = photo;
        return { ...retained, photoAssetAvailable: false };
      }),
      updatedAt: this.now().toISOString(),
    };
    try {
      this.writeSessions(sessions.value.map((item) => item.id === sessionId ? updated : item));
      return { ok: true };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  async deleteSession(sessionId: string): Promise<DeleteResult> {
    const sessions = this.readSessions();
    if (!sessions.ok) return { ok: false, error: 'damaged-storage' };
    const session = sessions.value.find(({ id }) => id === sessionId);
    if (!session) return { ok: false, error: 'session-not-found' };
    for (const assetId of unique(session.photoMeasurements.flatMap(({ photoAssetId }) => photoAssetId ? [photoAssetId] : []))) {
      if (!(await this.deletePhotoAsset(assetId))) return { ok: false, error: 'storage-failed' };
    }
    try {
      this.writeSessions(sessions.value.filter(({ id }) => id !== sessionId));
      return { ok: true };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  private writeSessions(sessions: PostureScreeningSession[]): void {
    this.storage.setItem(POSTURE_SCREENING_SESSIONS_KEY, JSON.stringify(sessions));
  }

  private async deletePhotoAsset(assetId: string): Promise<boolean> {
    try {
      const database = await this.openDatabase();
      const readTransaction = database.transaction(PHOTO_ASSET_STORE, 'readonly');
      const asset = await request<PosturePhotoAsset | undefined>(readTransaction.objectStore(PHOTO_ASSET_STORE).get(assetId));
      await transactionDone(readTransaction);
      if (!asset) {
        database.close();
        return true;
      }
      const transaction = database.transaction([PHOTO_ASSET_STORE, PHOTO_BLOB_STORE], 'readwrite');
      transaction.objectStore(PHOTO_ASSET_STORE).delete(assetId);
      transaction.objectStore(PHOTO_BLOB_STORE).delete(asset.blobId);
      await transactionDone(transaction);
      database.close();
      return true;
    } catch {
      return false;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!this.factory) {
        reject(new Error('indexeddb-unavailable'));
        return;
      }
      let opening: IDBOpenDBRequest;
      try {
        opening = this.factory.open(this.databaseName, 1);
      } catch (error) {
        reject(error);
        return;
      }
      opening.onupgradeneeded = () => {
        const database = opening.result;
        if (!database.objectStoreNames.contains(PHOTO_ASSET_STORE)) database.createObjectStore(PHOTO_ASSET_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(PHOTO_BLOB_STORE)) database.createObjectStore(PHOTO_BLOB_STORE, { keyPath: 'id' });
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error ?? new Error('indexeddb-open-failed'));
    });
  }
}

export function createPostureScreeningRepository(): PostureScreeningRepository {
  if (typeof window === 'undefined') throw new Error('Posture screening storage is only available in the browser.');
  return new PostureScreeningRepository(window.localStorage, window.indexedDB);
}

export function normalizePostureScreeningSession(value: unknown): PostureScreeningSession | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isScreeningStatus(value.status)) return null;
  if (!isIsoString(value.createdAt) || !isIsoString(value.updatedAt) || !isIsoString(value.completedAt)) return null;
  if (!isPostureScreeningInput(value.input) || !isPostureScreeningResult(value.result)) return null;
  if (value.status !== value.result.status || !Array.isArray(value.photoMeasurements) || !value.photoMeasurements.every(isPhotoMeasurementSnapshot)) return null;
  if (value.context !== undefined && !isContext(value.context)) return null;
  return clone(value as unknown as PostureScreeningSession);
}

function normalizePostureScreeningDraft(value: unknown): PostureScreeningDraft | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isDraftStep(value.currentStep)) return null;
  if (!isRecord(value.answers) || !Array.isArray(value.photoMeasurements) || !value.photoMeasurements.every(isPhotoMeasurementSnapshot)) return null;
  if (!isIsoString(value.createdAt) || !isIsoString(value.updatedAt)) return null;
  if (value.context !== undefined && !isContext(value.context)) return null;
  return clone(value as unknown as PostureScreeningDraft);
}

function isPostureScreeningInput(value: unknown): value is PostureScreeningInput {
  if (!isRecord(value) || typeof value.age !== 'number' || typeof value.boundaryAccepted !== 'boolean') return false;
  if (value.functionalImpact !== undefined && (typeof value.functionalImpact !== 'number' || !Number.isInteger(value.functionalImpact) || value.functionalImpact < 0 || value.functionalImpact > 10)) return false;
  if (!Array.isArray(value.safetyFlags) || !Array.isArray(value.subjectiveObservations) || !isRecord(value.movement) || !isRecord(value.photo)) return false;
  if (!['neck-upper-quarter', 'thoracic-trunk', 'shoulder-asymmetry', 'unsure'].includes(String(value.primaryConcern))) return false;
  return typeof value.movement.testId === 'string' && (value.movement.status === 'completed' || value.movement.status === 'stopped')
    && Array.isArray(value.movement.stopSymptoms) && Array.isArray(value.movement.observations)
    && ['completed', 'skipped', 'invalid'].includes(String(value.photo.status))
    && Array.isArray(value.photo.observations) && Array.isArray(value.photo.reasonCodes);
}

function isPostureScreeningResult(value: unknown): value is PostureScreeningResult {
  return isRecord(value) && isScreeningStatus(value.status) && typeof value.summary === 'string'
    && Array.isArray(value.findings) && Array.isArray(value.evidenceIds) && Array.isArray(value.reasonCodes) && Array.isArray(value.nextActions)
    && value.algorithmVersion === '1.0.0' && value.protocolVersion === 'adult-posture-screening-v1';
}

function isPhotoMeasurementSnapshot(value: unknown): value is PosturePhotoMeasurementSnapshot {
  if (!isRecord(value) || (value.view !== 'front' && value.view !== 'left-lateral') || typeof value.photoAssetAvailable !== 'boolean') return false;
  if (value.protocolVersion !== undefined && value.protocolVersion !== 'posture-photo-standard-v1') return false;
  if (value.photoAssetId !== undefined && typeof value.photoAssetId !== 'string') return false;
  if (!isRecord(value.landmarks) || !Object.values(value.landmarks).every(isNormalizedPoint)) return false;
  if (!Array.isArray(value.measurements) || !value.measurements.every(isMeasurementSnapshot)) return false;
  return value.quality === 'valid' || value.quality === 'invalid';
}

function isMeasurementSnapshot(value: unknown): value is PostureMeasurementSnapshot {
  return isRecord(value) && typeof value.metricId === 'string' && Number.isFinite(value.value)
    && (value.unit === 'deg' || value.unit === 'ratio') && isStringArray(value.evidenceIds);
}

function isNormalizedPoint(value: unknown): value is NormalizedPoint {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number'
    && Number.isFinite(value.x) && Number.isFinite(value.y) && value.x >= 0 && value.x <= 1 && value.y >= 0 && value.y <= 1;
}

function isContext(value: unknown): value is PostureScreeningContext {
  return isRecord(value) && (value.planId === undefined || typeof value.planId === 'string')
    && (value.baselineSessionId === undefined || typeof value.baselineSessionId === 'string');
}

function isDraftStep(value: unknown): value is PostureScreeningDraftStep {
  return typeof value === 'string' && ['boundary', 'safety', 'concern', 'follow-up', 'movement', 'photo', 'review'].includes(value);
}

function isScreeningStatus(value: unknown): value is PostureScreeningResult['status'] {
  return typeof value === 'string' && ['completed', 'functional-only', 'mixed-evidence', 'safety-review', 'measurement-invalid'].includes(value);
}

function isIsoString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw) as unknown; } catch { return undefined; }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function createId(prefix: string, timestamp: string): string {
  return `${prefix}-${timestamp.replace(/\D/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
