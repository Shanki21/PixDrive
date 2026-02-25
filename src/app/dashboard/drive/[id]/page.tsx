"use client";
import { useEffect, useState } from "react";

export default function GalleryDetail({ params }: { params: { id: string } }) {
  const [gallery, setGallery] = useState<{ photos: Array<{ id: string; url: string }> } | null>(null);

  useEffect(() => {
    fetch(`/api/galleries/${params.id}`)
      .then((r) => r.json())
      .then(setGallery);
  }, []);

  if (!gallery) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      {gallery.photos.map((p) => (
        <img key={p.id} src={p.url} className="w-full h-40 object-cover" />
      ))}
    </div>
  );
}