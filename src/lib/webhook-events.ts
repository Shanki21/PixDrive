import prisma from "@/lib/prisma";

export async function markWebhookEventReceived({
  provider,
  eventId,
  eventType,
}: {
  provider: string;
  eventId: string;
  eventType?: string | null;
}) {
  const id = eventId.trim();
  if (!id) return { duplicate: false };

  const result = await prisma.webhookEvent.createMany({
    data: [
      {
        provider,
        eventId: id,
        eventType: eventType ?? null,
      },
    ],
    skipDuplicates: true,
  });

  return { duplicate: result.count === 0 };
}
