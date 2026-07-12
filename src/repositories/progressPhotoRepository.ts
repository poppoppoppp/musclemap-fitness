import { progressPhotoCategories, type ProgressPhotoCategory, type ProgressPhotoInput, type ProgressPhotoRecord } from '../types/progressPhoto';

const PHOTO_STORE = 'photos';
const BLOB_STORE = 'blobs';
export const DEFAULT_PHOTO_DB_NAME = 'musclemap-progress-photos-v1';
export const PHOTO_LOCAL_NOTICE_KEY = 'musclemap.photoLocalNotice.v1';

type SaveAttempt = { ok: true; record: ProgressPhotoRecord } | { ok: false; error: 'invalid-category' | 'invalid-date' | 'missing-photo' | 'storage-failed' };

export class ProgressPhotoRepository {
  constructor(private readonly factory: IDBFactory, private readonly databaseName = DEFAULT_PHOTO_DB_NAME, private readonly now: () => Date = () => new Date()) {}

  async list(): Promise<ProgressPhotoRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(PHOTO_STORE, 'readonly');
    const values = await request<ProgressPhotoRecord[]>(transaction.objectStore(PHOTO_STORE).getAll());
    await transactionDone(transaction);
    database.close();
    return values.sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
  }

  async get(id: string) {
    const database = await this.open();
    const transaction = database.transaction(PHOTO_STORE, 'readonly');
    const value = await request<ProgressPhotoRecord | undefined>(transaction.objectStore(PHOTO_STORE).get(id));
    await transactionDone(transaction);
    database.close();
    return value ?? null;
  }

  async getBlob(blobId: string) {
    const database = await this.open();
    const transaction = database.transaction(BLOB_STORE, 'readonly');
    const value = await request<{ id: string; blob: Blob } | undefined>(transaction.objectStore(BLOB_STORE).get(blobId));
    await transactionDone(transaction);
    database.close();
    return value?.blob ?? null;
  }

  async save(input: ProgressPhotoInput): Promise<ProgressPhotoRecord> {
    const result = await this.trySave(input);
    if (!result.ok) throw new Error(result.error);
    return result.record;
  }

  async trySave(input: ProgressPhotoInput | { category: string; date: string; blob?: Blob }): Promise<SaveAttempt> {
    if (!progressPhotoCategories.includes(input.category as ProgressPhotoCategory)) return { ok: false, error: 'invalid-category' };
    if (!isDateKey(input.date)) return { ok: false, error: 'invalid-date' };
    if (!(input.blob instanceof Blob)) return { ok: false, error: 'missing-photo' };
    const timestamp = this.now().toISOString();
    const id = createId('photo', timestamp);
    const blobId = createId('blob', timestamp);
    const record: ProgressPhotoRecord = clean({
      id,
      category: input.category as ProgressPhotoCategory,
      date: input.date,
      blobId,
      note: 'note' in input ? input.note?.trim() || undefined : undefined,
      width: 'width' in input ? input.width : undefined,
      height: 'height' in input ? input.height : undefined,
      orientation: 'orientation' in input ? input.orientation : undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    try {
      const database = await this.open();
      const transaction = database.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      transaction.objectStore(PHOTO_STORE).put(record);
      transaction.objectStore(BLOB_STORE).put({ id: blobId, blob: input.blob });
      await transactionDone(transaction);
      database.close();
      return { ok: true, record };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  async update(id: string, values: Partial<Pick<ProgressPhotoRecord, 'category' | 'date' | 'note'>>): Promise<ProgressPhotoRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    if (values.category && !progressPhotoCategories.includes(values.category)) throw new Error('invalid-category');
    if (values.date && !isDateKey(values.date)) throw new Error('invalid-date');
    const record = clean({ ...existing, ...values, note: values.note?.trim() || undefined, updatedAt: this.now().toISOString() });
    const database = await this.open();
    const transaction = database.transaction(PHOTO_STORE, 'readwrite');
    transaction.objectStore(PHOTO_STORE).put(record);
    await transactionDone(transaction);
    database.close();
    return record;
  }

  async delete(id: string) {
    const existing = await this.get(id);
    if (!existing) return false;
    const database = await this.open();
    const transaction = database.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
    transaction.objectStore(PHOTO_STORE).delete(id);
    transaction.objectStore(BLOB_STORE).delete(existing.blobId);
    await transactionDone(transaction);
    database.close();
    return true;
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const opening = this.factory.open(this.databaseName, 1);
      opening.onupgradeneeded = () => {
        const database = opening.result;
        if (!database.objectStoreNames.contains(PHOTO_STORE)) database.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(BLOB_STORE)) database.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error ?? new Error('indexeddb-open-failed'));
    });
  }
}

export function createProgressPhotoRepository() {
  if (typeof indexedDB === 'undefined') throw new Error('Photo storage is not available in this browser.');
  return new ProgressPhotoRepository(indexedDB);
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
}
function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error); transaction.onerror = () => reject(transaction.error); });
}
function isDateKey(value: string) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return false; const date = new Date(+match[1], +match[2] - 1, +match[3]); return date.getFullYear() === +match[1] && date.getMonth() === +match[2] - 1 && date.getDate() === +match[3]; }
function createId(prefix: string, timestamp: string) { return `${prefix}-${timestamp.replace(/\D/g, '')}-${Math.random().toString(36).slice(2, 8)}`; }
function clean<T extends object>(value: T): T { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T; }
