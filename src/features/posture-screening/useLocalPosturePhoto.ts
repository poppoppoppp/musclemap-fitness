import { useEffect, useRef, useState } from 'react';

export interface LocalPosturePhoto {
  file: File;
  url: string;
  width: number;
  height: number;
}

export default function useLocalPosturePhoto() {
  const [photo, setPhoto] = useState<LocalPosturePhoto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const activeUrl = useRef<string | null>(null);
  const requestId = useRef(0);

  const revokeActiveUrl = () => {
    if (!activeUrl.current) return;
    URL.revokeObjectURL(activeUrl.current);
    activeUrl.current = null;
  };

  const clear = () => {
    requestId.current += 1;
    revokeActiveUrl();
    setPhoto(null);
    setError('');
    setLoading(false);
  };

  const selectFile = async (file: File) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    revokeActiveUrl();
    setPhoto(null);
    if (!file.type.startsWith('image/')) {
      setError('请选择 JPG、PNG、WebP 或其他图片文件。');
      setLoading(false);
      return;
    }

    const url = URL.createObjectURL(file);
    activeUrl.current = url;
    setError('');
    setLoading(true);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (requestId.current !== currentRequest) return;
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('empty-image');
      setPhoto({ file, url, width: image.naturalWidth, height: image.naturalHeight });
      setLoading(false);
    } catch {
      if (requestId.current !== currentRequest) return;
      revokeActiveUrl();
      setPhoto(null);
      setLoading(false);
      setError('无法读取这张照片，请重新拍摄或选择其他图片。');
    }
  };

  useEffect(() => () => {
    requestId.current += 1;
    revokeActiveUrl();
  }, []);

  return { photo, error, loading, selectFile, clear };
}
