export interface CaptureCapabilities {
  supported: boolean;
  missing: string[];
}

export async function checkCaptureCapabilities(): Promise<CaptureCapabilities> {
  const missing: string[] = [];
  if (!window.isSecureContext) missing.push('secure-context');
  if (!navigator.mediaDevices?.getUserMedia) missing.push('camera-api');
  if (typeof Worker === 'undefined') missing.push('web-worker');
  if (typeof createImageBitmap === 'undefined') missing.push('image-bitmap');
  if (typeof HTMLCanvasElement === 'undefined') missing.push('canvas');

  if (!missing.length && !await supportsTransferableImageBitmap()) missing.push('transferable-image-bitmap');
  return { supported: missing.length === 0, missing };
}

async function supportsTransferableImageBitmap(): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  let bitmap: ImageBitmap | null = null;
  const channel = new MessageChannel();
  try {
    bitmap = await createImageBitmap(canvas);
    const received = new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), 500);
      channel.port2.onmessage = (event) => {
        window.clearTimeout(timeout);
        const transferred = event.data as ImageBitmap;
        transferred.close();
        resolve(true);
      };
    });
    channel.port1.postMessage(bitmap, [bitmap]);
    bitmap = null;
    return await received;
  } catch {
    return false;
  } finally {
    bitmap?.close();
    channel.port1.close();
    channel.port2.close();
  }
}
