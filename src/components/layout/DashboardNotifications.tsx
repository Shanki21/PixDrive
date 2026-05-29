"use client";

import { useEffect } from "react";
import { flushQueuedPixoraToast } from "@/lib/pixora-alerts";

export default function DashboardNotifications() {
  useEffect(() => {
    flushQueuedPixoraToast();
  }, []);

  return null;
}

