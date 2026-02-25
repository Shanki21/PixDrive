"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyDriveHero from "@/components/drive/EmptyDriveHero";
import AddGalleryModal from "@/components/drive/AddGalleryModal";

export default function DashboardPage() {
  const router = useRouter();
  const [hasGallery, setHasGallery] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);


  useEffect(() => {
    fetch("/api/galleries")
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          router.replace("/dashboard/drive");
        } else {
          setHasGallery(false);
        }
      });
  }, [router]);

  if (hasGallery === null) return null;

  return (
    <div className="max-w-275 mx-auto px-6">
<EmptyDriveHero onAdd={() => setOpen(true)} />
  <AddGalleryModal
  open={open}
  onClose={() => setOpen(false)}
  onCreated={() => {
    window.location.href = "/dashboard/drive";
  }}
/>
    </div>
    
  );
}