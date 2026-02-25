import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import slugify from "slugify";

export async function GET() {
  return NextResponse.json(await prisma.gallery.findMany());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const user = await prisma.user.upsert({
    where: { email: "demo@demo.com" },
    update: {},
    create: { email: "demo@demo.com" },
  });

  const gallery = await prisma.gallery.create({
    data: {
      name: body.name,
      slug: slugify(body.name),
      userId: user.id,
    },
  });

  return NextResponse.json(gallery);
}