import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gallery = await prisma.gallery.findUnique({
    where: { id: params.id },
    include: { photos: true },
  });

  return NextResponse.json(gallery);
}