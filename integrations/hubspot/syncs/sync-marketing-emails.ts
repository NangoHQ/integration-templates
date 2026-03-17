import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MarketingEmailSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    type: z.string().optional(),
    isPublished: z.boolean().optional(),
    state: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    author: z.string().optional(),
    contentType: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAt: z.string()
});

const MarketingEmailApiSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    subject: z.string().nullish(),
    type: z.string().nullish(),
    isPublished: z.boolean().nullish(),
    state: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    author: z.string().nullish(),
    contentType: z.string().nullish()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync marketing emails from HubSpot',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-marketing-emails', group: 'Marketing Emails' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['content'],

    models: {
        MarketingEmail: MarketingEmailSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

        const proxyConfig: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/reference/api/marketing/marketing-emails
            endpoint: '/marketing/v3/emails',
            params: {
                limit: '100',
                ...(checkpoint?.['updatedAt'] && { updatedAfter: checkpoint['updatedAt'] })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next.after',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit: 100
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const emails = z.array(MarketingEmailApiSchema).parse(batch);
            const records = emails.map((email) => ({
                id: email.id,
                name: email.name ?? undefined,
                subject: email.subject ?? undefined,
                type: email.type ?? undefined,
                isPublished: email.isPublished ?? undefined,
                state: email.state ?? undefined,
                createdAt: email.createdAt ?? undefined,
                updatedAt: email.updatedAt ?? undefined,
                author: email.author ?? undefined,
                contentType: email.contentType ?? undefined
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'MarketingEmail');

            const lastRecord = records[records.length - 1];
            if (lastRecord?.updatedAt) {
                await nango.saveCheckpoint({
                    updatedAt: lastRecord.updatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
