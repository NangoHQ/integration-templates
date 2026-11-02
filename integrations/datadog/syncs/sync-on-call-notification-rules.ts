import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        userIds: z
            .array(z.string().min(1).describe('Owner user ID; requires self or on_call_admin access.'))
            .min(1)
            .refine((userIds) => new Set(userIds).size === userIds.length, { message: 'userIds must not contain duplicates' })
            .meta({ uniqueItems: true })
            .describe('Owner user IDs whose personal alert preferences belong in the dataset; each requires self/admin access.')
    })
    .describe('Sync configuration selecting the Datadog users whose personal On-Call notification rules are synced.');

const OnCallNotificationRuleSchema = z
    .object({
        id: z.string().describe('Opaque notification rule ID.'),
        userId: z.string().describe('Owner user ID.'),
        category: z.enum(['high_urgency', 'low_urgency']).describe('Urgency category to which the rule applies.').optional(),
        channelId: z.string().describe('Referenced owned notification channel ID when returned.').optional(),
        phoneMethod: z
            .literal(['sms', 'voice', null])
            .meta({ type: ['string', 'null'] })
            .describe('Phone method; null for explicit null settings, omitted for absent settings.')
            .optional(),
        delayMinutes: z.number().int().describe('Minutes before rule evaluation; zero means immediate.').optional()
    })
    .describe("A user's personal Datadog On-Call notification rule with channel reference, urgency category and evaluation delay.");

type OnCallNotificationRule = z.infer<typeof OnCallNotificationRuleSchema>;

const ChannelSettingsSchema = z.object({
    type: z.literal('phone'),
    method: z.enum(['sms', 'voice'])
});

const NotificationRuleSchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            category: z.enum(['high_urgency', 'low_urgency']).optional(),
            channel_settings: ChannelSettingsSchema.optional(),
            delay_minutes: z.number().int().optional()
        })
        .optional(),
    relationships: z
        .object({
            channel: z
                .object({
                    data: z
                        .object({
                            id: z.string().optional()
                        })
                        .nullable()
                        .optional()
                })
                .optional()
        })
        .optional()
});

const ListNotificationRulesResponseSchema = z.object({
    data: z.array(NotificationRuleSchema)
});

const sync = createSync({
    description:
        "Make selected users' personal On-Call alert preference records available, with channel references, urgency and evaluation delay. Requires self or on_call_admin authority.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        OnCallNotificationRule: OnCallNotificationRuleSchema
    },

    exec: async (nango) => {
        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata for sync-on-call-notification-rules: ${metadataResult.error.message}`);
        }
        const { userIds } = metadataResult.data;

        await nango.trackDeletesStart('OnCallNotificationRule');

        for (const userId of userIds) {
            // https://docs.datadoghq.com/api/latest/on-call/list-on-call-notification-rules-for-a-user/
            const response = await nango.get({
                endpoint: `/v2/on-call/users/${encodeURIComponent(userId)}/notification-rules`,
                params: {
                    include: 'channel'
                },
                retries: 3
            });

            const parsed = ListNotificationRulesResponseSchema.parse(response.data);

            const records: OnCallNotificationRule[] = [];
            for (const rule of parsed.data) {
                const attributes = rule.attributes;
                const channelId = rule.relationships?.channel?.data?.id;
                const channelSettings = attributes?.channel_settings;

                records.push({
                    id: rule.id,
                    userId,
                    ...(attributes?.category !== undefined ? { category: attributes.category } : {}),
                    ...(channelId !== undefined ? { channelId } : {}),
                    ...(channelSettings === undefined ? {} : { phoneMethod: channelSettings === null ? null : channelSettings.method }),
                    ...(attributes?.delay_minutes !== undefined ? { delayMinutes: attributes.delay_minutes } : {})
                });
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'OnCallNotificationRule');
            }
        }

        await nango.trackDeletesEnd('OnCallNotificationRule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
