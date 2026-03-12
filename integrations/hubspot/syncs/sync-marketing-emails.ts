import { createSync } from 'nango';
import { z } from 'zod';

const MarketingEmailSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    subject: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    isPublished: z.union([z.boolean(), z.null()]),
    state: z.union([z.string(), z.null()]),
    createdAt: z.union([z.string(), z.null()]),
    updatedAt: z.union([z.string(), z.null()]),
    author: z.union([z.string(), z.null()]),
    contentType: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

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
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig = {
            // https://developers.hubspot.com/docs/reference/api/marketing/marketing-emails
            endpoint: '/marketing/v3/emails',
            params: {
                limit: '100',
                ...(checkpoint?.['updated_after'] && { updatedAfter: checkpoint['updated_after'] })
            },
            paginate: {
                type: 'cursor' as const,
                cursor_path_in_response: 'paging.next.after',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit: 100
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const records = batch.map((email: any) => ({
                id: email.id,
                name: email.name ?? null,
                subject: email.subject ?? null,
                type: email.type ?? null,
                isPublished: email.isPublished ?? null,
                state: email.state ?? null,
                createdAt: email.createdAt ?? null,
                updatedAt: email.updatedAt ?? null,
                author: email.author ?? null,
                contentType: email.contentType ?? null
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'MarketingEmail');

            const lastRecord = records[records.length - 1];
            if (lastRecord?.updatedAt) {
                await nango.saveCheckpoint({
                    updated_after: lastRecord.updatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
