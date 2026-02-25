import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const photo = await prisma.photo.create({
    data: {
      name: body.name,
      url: body.url,
      galleryId: params.id,
    },
  });

  return NextResponse.json(photo);
}