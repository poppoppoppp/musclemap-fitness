import { useEffect, useState } from 'react';
import { createProgressPhotoRepository } from '../../repositories/progressPhotoRepository';

export default function LocalPhoto({ blobId, alt, className = '' }: { blobId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    createProgressPhotoRepository().getBlob(blobId).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [blobId]);
  return url ? <img src={url} alt={alt} className={`bg-black/30 object-cover ${className}`} /> : <div role="img" aria-label={`${alt}加载中`} className={`animate-pulse bg-white/[0.05] ${className}`} />;
}
