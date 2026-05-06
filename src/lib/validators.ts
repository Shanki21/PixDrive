import type { ZodSchema } from "zod";
import type { NextRequest } from "next/server";
import { BadRequestError } from "@/lib/errors";

export async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (req: NextRequest): Promise<T> {
    const body = await parseJsonBody(req);
    const result = schema.safeParse(body);
    if (!result.success) {
      const first = result.error.issues[0];
      throw new BadRequestError(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid request body');
    }
    return result.data;
  };
}
