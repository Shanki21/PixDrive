import { Prisma } from "@prisma/client";

export function isPrismaUnavailableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function getPrismaUnavailableMessage() {
  return "Database unavailable. Ensure PostgreSQL is running and DATABASE_URL is correct.";
}
