import { Prisma } from "@prisma/client";

export function isPrismaUnavailableError(error: unknown) {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    code === "P1001" ||
    code === "P2021" ||
    code === "P2022"
  );
}

export function getPrismaUnavailableMessage() {
  return "Database unavailable or schema is not migrated. Check DATABASE_URL and run Prisma migrations.";
}
