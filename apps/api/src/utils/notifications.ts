import type { PrismaClient } from "@buildtrack/database";

const defaultPreference = {
  inAppEnabled: true,
  emailEnabled: false,
  digestFrequency: "immediate",
  notifyTaskAssigned: true,
  notifyRfiAssigned: true,
  notifyRfiResponse: true,
  notifyProjectUpdates: true,
};

export type NotificationPreferenceKey =
  | "notifyTaskAssigned"
  | "notifyRfiAssigned"
  | "notifyRfiResponse"
  | "notifyProjectUpdates";

type NotifyInput = {
  tenantId: string;
  actorId?: string;
  userIds: string[];
  type: string;
  title: string;
  message: string;
  link?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  preferenceKey?: NotificationPreferenceKey;
};

export async function notifyUsers(prisma: PrismaClient, input: NotifyInput) {
  const uniqueUserIds = Array.from(
    new Set(input.userIds.filter(Boolean)),
  ).filter((id) => id && id !== input.actorId);

  if (uniqueUserIds.length === 0) return { sent: 0 };

  const preferences = await prisma.notificationPreference.findMany({
    where: { tenantId: input.tenantId, userId: { in: uniqueUserIds } },
  });
  const prefMap = new Map(preferences.map((pref) => [pref.userId, pref]));

  const data = uniqueUserIds.flatMap((userId) => {
    const pref = prefMap.get(userId) ?? defaultPreference;
    const allowEvent =
      !input.preferenceKey ||
      (pref as typeof defaultPreference)[input.preferenceKey];

    if (!pref.inAppEnabled || !allowEvent) {
      return [];
    }

    return [
      {
        tenantId: input.tenantId,
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        priority: input.priority || "normal",
      },
    ];
  });

  if (data.length === 0) return { sent: 0 };

  await prisma.notification.createMany({ data });
  return { sent: data.length };
}

export async function ensureNotificationPreference(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
) {
  return prisma.notificationPreference.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: {},
    create: { tenantId, userId },
  });
}
