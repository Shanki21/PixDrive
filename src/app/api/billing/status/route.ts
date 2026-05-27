import { getRazorpayBillingConfigStatus, getUserBillingState } from "@/lib/billing";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";
import { NextRequest, NextResponse } from "next/server";

export const GET = withApiHandler(async (req: NextRequest) => {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const billing = await getUserBillingState(user.id);
  return NextResponse.json({ ok: true, billing, billingConfig: { razorpay: getRazorpayBillingConfigStatus() } });
});
