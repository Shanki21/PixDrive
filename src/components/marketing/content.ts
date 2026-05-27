import { Camera, Download, Folders, Share2, UploadCloud } from "lucide-react";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Gallery", href: "#gallery" },
  { label: "Pricing", href: "#pricing" },
  { label: "Referral", href: "#referral" },
];

export const TRUST_LOGOS = ["Luna Studio", "Frame & Co", "North Lens", "Afterlight", "Memora Labs", "Slate Weddings"];

export const CORE_FEATURES = [
  {
    title: "Client-Ready Galleries",
    description: "Share polished event spaces with secure links and fast load times across all devices.",
  },
  {
    title: "Proofing That Flows",
    description: "Collect picks and approvals in one clean stream so your delivery process stays effortless.",
  },
  {
    title: "Delivery Without Friction",
    description: "Move from upload to final handoff with fewer manual steps and a premium presentation.",
  },
];

export const WORKFLOW_STEPS = [
  {
    label: "Create",
    detail: "Create an event space with title, date, client visibility rules, and polished gallery settings.",
    metric: "30 sec setup",
    Icon: Camera,
  },
  {
    label: "Upload",
    detail: "Drop raw or edited batches, keep originals safe, and instantly generate preview-ready thumbnails.",
    metric: "Bulk batch upload",
    Icon: UploadCloud,
  },
  {
    label: "Organize",
    detail: "Sort into folders, set cover moments, and keep every sequence structured for easy navigation.",
    metric: "Smart folder flow",
    Icon: Folders,
  },
  {
    label: "Share",
    detail: "Send one elegant link with private access controls so clients can view and shortlist confidently.",
    metric: "Secure share links",
    Icon: Share2,
  },
  {
    label: "Deliver",
    detail: "Finalize approvals, export selections, and provide a premium high-resolution delivery experience.",
    metric: "Final-ready delivery",
    Icon: Download,
  },
];

export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0 },
};
