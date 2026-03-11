"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyDrive from "@/components/drive/EmptyDrive";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import { saveGalleryMeta } from "@/lib/gallery-meta-storage";

export default function DashboardPage() {
  const router = useRouter();
  const [hasGallery, setHasGallery] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);


  useEffect(() => {
    fetch("/api/galleries")
      .then(async (res) => {
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("application/json")) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          router.replace("/dashboard/drive");
        } else {
          setHasGallery(false);
        }
      })
      .catch(() => setHasGallery(false));
  }, [router]);

  if (hasGallery === null) return null;

  return (
    <div className="max-w-275 mx-auto px-6">
<EmptyDrive onCreate={() => setOpen(true)} />
  <AddGalleryModal
  open={open}
  onClose={() => setOpen(false)}
  onCreated={(gallery) => {
    saveGalleryMeta(gallery.id, {
      expiresAt: gallery.expiresAt ?? null,
      storageTimeLabel: gallery.storageTimeLabel ?? null,
    });
    router.push("/dashboard/drive");
  }}
/>
    </div>
    
  );
}
