'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Film, ImageIcon } from 'lucide-react';
import type { PromptCase } from '@/lib/prompt-library/types';

export function PromptCaseCard({ item }: { item: PromptCase }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState('9 / 16');
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoSrc = `/api/prompt-library/media/${encodeURIComponent(item.id)}`;

  useEffect(() => {
    if (!isHovering || !shouldLoadVideo) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, [isHovering, shouldLoadVideo]);

  function playPreview() {
    setIsHovering(true);
    setShouldLoadVideo(true);
  }

  function pausePreview() {
    setIsHovering(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }

  function updateVideoRatio() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
  }

  return (
    <article
      className="group mb-4 break-inside-avoid overflow-hidden rounded-xl"
      onMouseEnter={playPreview}
      onMouseLeave={pausePreview}
    >
      <Link href={`/prompt-library/${item.id}`} className="block">
        <div className="relative overflow-hidden rounded-xl bg-transparent" style={{ aspectRatio }}>
          {item.mediaType === 'video' && item.mediaUrl && shouldLoadVideo ? (
            <video
              ref={videoRef}
              src={videoSrc}
              poster={item.coverUrl}
              onLoadedMetadata={updateVideoRatio}
              onLoadedData={updateVideoRatio}
              onCanPlay={() => {
                if (isHovering) videoRef.current?.play().catch(() => {});
              }}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              muted
              loop
              playsInline
              preload="none"
            />
          ) : item.mediaType === 'video' && (item.coverUrl || item.mediaUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl || item.mediaUrl}
              alt={item.title}
              onLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
                }
              }}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : item.coverUrl || item.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl || item.mediaUrl}
              alt={item.title}
              onLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
                }
              }}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-white/35">
              {item.mediaType === 'image' ? <ImageIcon className="h-10 w-10" /> : <Film className="h-10 w-10" />}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-4 p-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="mb-2 flex items-center gap-2 text-xs text-white/65">
              {item.tool && <span>{item.tool}</span>}
              {item.category && <span>{item.category}</span>}
            </div>
            <h2 className="line-clamp-1 text-base font-semibold leading-tight text-white">{item.title}</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] text-white/75">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
