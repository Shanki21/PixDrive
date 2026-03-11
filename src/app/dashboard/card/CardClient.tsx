"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { DashboardProfile, loadProfile, saveProfile } from "@/lib/profile-storage";

type ActiveModal = "card" | "email" | "social" | null;

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "YouTube", "WhatsApp", "Telegram", "X", "LinkedIn"];

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getPublicLink(profile: DashboardProfile) {
  const seed = (profile.email || profile.name || "yourname")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  return `${seed || "yourname"}.pixora.pro/me`;
}

export default function CardClient() {
  const [profile, setProfile] = useState<DashboardProfile>(() => loadProfile());
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const [draftName, setDraftName] = useState(profile.name);
  const [draftOccupation, setDraftOccupation] = useState(profile.occupation);
  const [draftPhone, setDraftPhone] = useState(profile.phone);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [draftPlatform, setDraftPlatform] = useState(PLATFORM_OPTIONS[0]);
  const [draftSocialLink, setDraftSocialLink] = useState("");
  const [editingSocialIndex, setEditingSocialIndex] = useState<number | null>(null);
  const [socialError, setSocialError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const initials = useMemo(() => getInitials(profile.name), [profile.name]);
  const publicLink = useMemo(() => getPublicLink(profile), [profile]);

  const openCardModal = () => {
    setDraftName(profile.name);
    setDraftOccupation(profile.occupation);
    setDraftPhone(profile.phone);
    setActiveModal("card");
  };

  const openEmailModal = () => {
    setDraftEmail(profile.email);
    setActiveModal("email");
  };

  const openSocialModal = (index: number | null = null) => {
    if (index == null) {
      setEditingSocialIndex(null);
      setDraftPlatform(PLATFORM_OPTIONS[0]);
      setDraftSocialLink("");
      setSocialError("");
      setActiveModal("social");
      return;
    }

    const item = profile.socialAccounts[index];
    if (!item) return;
    setEditingSocialIndex(index);
    setDraftPlatform(item.platform);
    setDraftSocialLink(item.url);
    setSocialError("");
    setActiveModal("social");
  };

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatarDataUrl: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="absolute inset-0 bg-linear-to-br from-slate-100 via-slate-50 to-slate-200" />
      <div className="relative grid min-h-screen grid-cols-1 lg:min-h-175 lg:grid-cols-4">
        <section className="bg-white/85 p-4 lg:col-span-1 lg:border-r lg:border-slate-200/70 lg:p-5">
          <p className="text-sm leading-6 text-slate-800">
            &quot;Business card&quot; is where visitors can find your contact info and get in touch.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            The widget can be displayed both on the drive and on your website.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">And it is always available by direct link</p>
          <p className="text-sm leading-6 text-blue-600">{publicLink}</p>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-base text-slate-900">Show on the website</span>
            <button
              className={`relative h-6 w-11 rounded-full transition ${profile.showOnWebsite ? "bg-blue-500" : "bg-slate-300"}`}
              onClick={() => setProfile((prev) => ({ ...prev, showOnWebsite: !prev.showOnWebsite }))}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  profile.showOnWebsite ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <h3 className="mt-8 text-xs font-semibold tracking-wide text-slate-900">NAME AND CONTACT INFO</h3>

          <div className="mt-3 space-y-3 border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Profile picture</span>
              <button className="text-blue-600 hover:underline" onClick={() => fileInputRef.current?.click()}>
                Upload
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Your name</span>
              <button className="max-w-44 truncate text-right text-blue-600 hover:underline" onClick={openCardModal}>
                {profile.name || "Undefined"}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Occupation</span>
              <button className="max-w-44 truncate text-right text-blue-600 hover:underline" onClick={openCardModal}>
                {profile.occupation || "Undefined"}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Phone number</span>
              <button
                className="max-w-44 truncate text-right text-blue-600 hover:underline"
                onClick={openCardModal}
              >
                {profile.phone || "Undefined"}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Email</span>
              <button className="max-w-44 truncate text-right text-blue-600 hover:underline" onClick={openEmailModal}>
                {profile.email || "Undefined"}
              </button>
            </div>
          </div>

          <h3 className="mt-8 text-xs font-semibold tracking-wide text-slate-900">SOCIAL MEDIA ACCOUNTS</h3>
          <button className="mt-3 text-sm text-blue-600 hover:underline" onClick={() => openSocialModal()}>
            Add
          </button>

          {profile.socialAccounts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {profile.socialAccounts.map((item, idx) => (
                <li key={`${item.platform}-${item.url}-${idx}`} className="rounded-md bg-slate-100 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.platform}</span>
                    <div className="flex items-center gap-3">
                      <button className="text-blue-600 hover:underline" onClick={() => openSocialModal(idx)}>
                        Edit
                      </button>
                      <button
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() =>
                          setProfile((prev) => ({
                            ...prev,
                            socialAccounts: prev.socialAccounts.filter((_, entryIdx) => entryIdx !== idx),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-blue-700 hover:underline"
                    >
                      {item.url}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 rounded-md border-l-4 border-blue-500 bg-blue-50 px-3 py-3 text-sm text-slate-700">
            The list of social networks for the site is edited in the Design section.
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </section>

        <section className="relative p-4 lg:col-span-3 lg:p-10">
          <div className="absolute inset-0 hidden opacity-60 sm:block">
            <div className="grid h-full grid-cols-3 gap-6 p-6">
              <div className="rounded-lg bg-slate-200/70" />
              <div className="rounded-lg bg-slate-200/70" />
              <div className="rounded-lg bg-slate-200/70" />
              <div className="rounded-lg bg-slate-200/70" />
              <div className="rounded-lg bg-slate-200/70" />
              <div className="rounded-lg bg-slate-200/70" />
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-4 w-full max-w-xl rounded-sm border border-slate-200 bg-white p-6 text-center shadow-2xl sm:mt-6 sm:p-10">
            {profile.avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarDataUrl}
                alt={profile.name || "Profile picture"}
                className="mx-auto h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl text-slate-400">
                {initials}
              </div>
            )}
            <h2 className="mt-8 text-3xl font-light tracking-tight text-slate-900 sm:text-5xl">
              {profile.name || "Your Name"}
            </h2>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">{profile.occupation || "Occupation"}</p>
            <p className="mt-5 text-2xl font-light tracking-tight text-slate-900 sm:text-4xl">
              {profile.phone || "+1 000 000 0000"}
            </p>
            {profile.email ? <p className="mt-2 text-sm text-slate-500">{profile.email}</p> : null}

            <button className="mt-10 h-12 w-full rounded-md bg-slate-900 text-sm font-semibold text-white hover:bg-black">
              Save contact
            </button>
          </div>
        </section>
      </div>

      {activeModal ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl sm:p-7">
            {activeModal === "card" ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Editing card</h4>
                  <button className="h-10 w-10 rounded-md bg-slate-100 text-xl" onClick={() => setActiveModal(null)}>
                    x
                  </button>
                </div>
                <div className="mt-6 rounded-md bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-slate-800">
                    <span className="mb-2 block">Your name</span>
                    <input
                      className="h-11 w-full rounded border border-slate-300 px-3"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </label>
                  <label className="mt-4 block text-sm font-medium text-slate-800">
                    <span className="mb-2 block">Occupation</span>
                    <input
                      className="h-11 w-full rounded border border-slate-300 px-3"
                      value={draftOccupation}
                      onChange={(e) => setDraftOccupation(e.target.value)}
                    />
                  </label>
                  <label className="mt-4 block text-sm font-medium text-slate-800">
                    <span className="mb-2 block">Phone number</span>
                    <input
                      className="h-11 w-full rounded border border-slate-300 px-3"
                      placeholder="+1 000 000 0000"
                      value={draftPhone}
                      onChange={(e) => setDraftPhone(e.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button className="h-10 rounded border border-slate-300 px-6" onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button
                    className="h-10 rounded bg-black px-6 text-white"
                    onClick={() => {
                      setProfile((prev) => ({
                        ...prev,
                        name: draftName.trim(),
                        occupation: draftOccupation.trim(),
                        phone: draftPhone.trim(),
                      }));
                      setActiveModal(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : null}

            {activeModal === "email" ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Edit email</h4>
                  <button className="h-10 w-10 rounded-md bg-slate-100 text-xl" onClick={() => setActiveModal(null)}>
                    x
                  </button>
                </div>
                <div className="mt-6 rounded-md bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-slate-800">
                    <span className="mb-2 block">Email</span>
                    <input
                      className="h-11 w-full rounded border border-slate-300 px-3"
                      placeholder="e.g. hi@pixora.com"
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button className="h-10 rounded border border-slate-300 px-6" onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button
                    className="h-10 rounded bg-black px-6 text-white"
                    onClick={() => {
                      setProfile((prev) => ({ ...prev, email: draftEmail.trim().toLowerCase() }));
                      setActiveModal(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : null}

            {activeModal === "social" ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    {editingSocialIndex == null ? "Add social media" : "Edit social media"}
                  </h4>
                  <button className="h-10 w-10 rounded-md bg-slate-100 text-xl" onClick={() => setActiveModal(null)}>
                    x
                  </button>
                </div>
                <div className="mt-6 rounded-md bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-slate-800">
                    <span className="mb-2 block">Social media</span>
                    <select
                      className="h-11 w-full rounded border border-slate-300 px-3"
                      value={draftPlatform}
                      onChange={(e) => setDraftPlatform(e.target.value)}
                    >
                      {PLATFORM_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-4 block text-sm font-medium text-slate-800">
                    <span className="mb-2 block">Link</span>
                    <input
                      className={`h-11 w-full rounded border px-3 ${socialError ? "border-red-400" : "border-slate-300"}`}
                      placeholder="https://instagram.com/your-handle"
                      value={draftSocialLink}
                      onChange={(e) => {
                        setDraftSocialLink(e.target.value);
                        if (socialError) setSocialError("");
                      }}
                    />
                  </label>
                  {socialError ? <p className="mt-2 text-sm text-red-500">{socialError}</p> : null}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button className="h-10 rounded border border-slate-300 px-6" onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button
                    className="h-10 rounded bg-black px-6 text-white"
                    onClick={() => {
                      const url = normalizeUrl(draftSocialLink);
                      if (!url) {
                        setSocialError("Please enter a valid social link.");
                        return;
                      }

                      setProfile((prev) => ({
                        ...prev,
                        socialAccounts:
                          editingSocialIndex == null
                            ? [
                                ...prev.socialAccounts,
                                {
                                  platform: draftPlatform,
                                  url,
                                },
                              ]
                            : prev.socialAccounts.map((item, idx) =>
                                idx === editingSocialIndex ? { platform: draftPlatform, url } : item
                              ),
                      }));
                      setEditingSocialIndex(null);
                      setDraftSocialLink("");
                      setSocialError("");
                      setActiveModal(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}



