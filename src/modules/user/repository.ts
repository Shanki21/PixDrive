import prisma from "@/lib/prisma";

export type UserRow = {
  id: string;
  email: string;
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findOrCreateUserByEmail(email: string) {
  return prisma.user.upsert({ where: { email }, update: {}, create: { email } });
}

export async function createUserByEmail(email: string) {
  return prisma.user.create({ data: { email } });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
