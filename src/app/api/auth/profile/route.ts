import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  normalizeOptionalSingleLine,
  normalizeSingleLine,
} from "@/lib/input-security";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { normalizePublicUrl } from "@/lib/url-security";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_PROFILE_NAME_LENGTH = 120;
const MAX_OCCUPATION_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MAX_LOCATION_LENGTH = 80;
const MAX_COMPANY_FIELD_LENGTH = 140;
const MAX_TAX_NUMBER_LENGTH = 80;
const MAX_SOCIAL_PLATFORM_LENGTH = 40;
const MAX_SOCIAL_URL_LENGTH = 2048;
const MAX_SOCIAL_ACCOUNTS = 12;
const MAX_AVATAR_DATA_URL_LENGTH = 1_500_000;
const ALLOWED_AVATAR_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i;

function normalizeAvatarUrl(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:image/")) {
    if (trimmed.length > MAX_AVATAR_DATA_URL_LENGTH || !ALLOWED_AVATAR_DATA_URL.test(trimmed)) {
      return undefined;
    }
    return trimmed;
  }

  return (
    normalizePublicUrl(trimmed, {
      allowHttpLocalhost: process.env.NODE_ENV !== "production",
    }) ?? undefined
  );
}

function normalizeSocialAccounts(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const platform = normalizeSingleLine((entry as { platform?: unknown }).platform, MAX_SOCIAL_PLATFORM_LENGTH);
      const url = normalizePublicUrl(String((entry as { url?: unknown }).url ?? "").trim(), {
        allowHttpLocalhost: process.env.NODE_ENV !== "production",
      });

      if (!platform || !url || url.length > MAX_SOCIAL_URL_LENGTH) {
        return null;
      }

      return { platform, url };
    })
    .filter((entry): entry is { platform: string; url: string } => entry !== null)
    .slice(0, MAX_SOCIAL_ACCOUNTS);

  return normalized;
}

export async function GET(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });

  return NextResponse.json({ ok: true, profile: user.profile ?? null });
}

export const PATCH = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });

    const updateData: Prisma.UserProfileUpdateInput = {};
    const createData: Prisma.UserProfileCreateInput = {
      user: {
        connect: { id: user.id },
      },
    };

    if ("name" in body) {
      const name = normalizeOptionalSingleLine(body.name, MAX_PROFILE_NAME_LENGTH);
      updateData.name = name;
      createData.name = name;
    }

    if ("occupation" in body) {
      const occupation = normalizeOptionalSingleLine(body.occupation, MAX_OCCUPATION_LENGTH);
      updateData.occupation = occupation;
      createData.occupation = occupation;
    }

    if ("phone" in body) {
      const phone = normalizeOptionalSingleLine(body.phone, MAX_PHONE_LENGTH);
      updateData.phone = phone;
      createData.phone = phone;
    }

    if ("country" in body) {
      const country = normalizeOptionalSingleLine(body.country, MAX_LOCATION_LENGTH);
      updateData.country = country;
      createData.country = country;
    }

    if ("state" in body) {
      const state = normalizeOptionalSingleLine(body.state, MAX_LOCATION_LENGTH);
      updateData.state = state;
      createData.state = state;
    }

    if ("city" in body) {
      const city = normalizeOptionalSingleLine(body.city, MAX_LOCATION_LENGTH);
      updateData.city = city;
      createData.city = city;
    }

    if ("companyName" in body) {
      const companyName = normalizeOptionalSingleLine(body.companyName, MAX_COMPANY_FIELD_LENGTH);
      updateData.companyName = companyName;
      createData.companyName = companyName;
    }

    if ("industry" in body) {
      const industry = normalizeOptionalSingleLine(body.industry, MAX_COMPANY_FIELD_LENGTH);
      updateData.industry = industry;
      createData.industry = industry;
    }

    if ("industryArea" in body) {
      const industryArea = normalizeOptionalSingleLine(body.industryArea, MAX_COMPANY_FIELD_LENGTH);
      updateData.industryArea = industryArea;
      createData.industryArea = industryArea;
    }

    if ("averageEventsPerYear" in body) {
      const averageEventsPerYear = normalizeOptionalSingleLine(body.averageEventsPerYear, MAX_COMPANY_FIELD_LENGTH);
      updateData.averageEventsPerYear = averageEventsPerYear;
      createData.averageEventsPerYear = averageEventsPerYear;
    }

    if ("billingCompanyName" in body) {
      const billingCompanyName = normalizeOptionalSingleLine(body.billingCompanyName, MAX_COMPANY_FIELD_LENGTH);
      updateData.billingCompanyName = billingCompanyName;
      createData.billingCompanyName = billingCompanyName;
    }

    if ("taxNumber" in body) {
      const taxNumber = normalizeOptionalSingleLine(body.taxNumber, MAX_TAX_NUMBER_LENGTH);
      updateData.taxNumber = taxNumber;
      createData.taxNumber = taxNumber;
    }

    if ("avatarUrl" in body) {
      const avatarUrl = normalizeAvatarUrl(body.avatarUrl);
      if (avatarUrl === undefined) {
        return NextResponse.json({ ok: false, message: "Invalid avatar image." }, { status: 400 });
      }
      updateData.avatarUrl = avatarUrl;
      createData.avatarUrl = avatarUrl;
    }

    if ("socialAccounts" in body) {
      const socialAccounts = normalizeSocialAccounts(body.socialAccounts);
      if (socialAccounts === undefined) {
        return NextResponse.json({ ok: false, message: "Invalid social accounts." }, { status: 400 });
      }

      updateData.socialAccounts = socialAccounts as Prisma.InputJsonValue;
      createData.socialAccounts = socialAccounts as Prisma.InputJsonValue;
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: createData,
    });

    return NextResponse.json({ ok: true, profile });
  }, { keyPrefix: "auth:profile:update", limit: 30, windowMs: 60 * 60 * 1000 })
);
