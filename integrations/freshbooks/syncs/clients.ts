import { createSync } from 'nango';
import { z } from 'zod';

const ClientSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const RawClientSchema = z
    .object({
        id: z.number(),
        updated: z.string().optional()
    })
    .passthrough();

function formatUpdatedSince(date: string): string {
    return date.replace(' ', 'T');
}

const sync = createSync({
    description: 'Sync clients.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Client: ClientSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        const rawCheckpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined;
        if (rawCheckpoint !== undefined && rawCheckpoint !== null) {
            const looseCheckpoint = z.object({}).passthrough();
            const parsed = looseCheckpoint.safeParse(rawCheckpoint);
            if (!parsed.success) {
                throw new Error(`Invalid checkpoint: ${parsed.error.message}`);
            }
            const checkpointObj = parsed.data;
            const maybeUpdatedAfter = checkpointObj['updated_after'];
            if (maybeUpdatedAfter !== undefined) {
                if (typeof maybeUpdatedAfter !== 'string') {
                    throw new Error('Invalid checkpoint: updated_after must be a string');
                }
                updatedAfter = maybeUpdatedAfter;
            }
        }

        // https://www.freshbooks.com/api/clients
        for await (const page of nango.paginate({
            endpoint: `/accounting/account/${encodeURIComponent(metadata.accountId)}/users/clients`,
            params: {
                sort: 'updated:asc',
                ...(updatedAfter && { 'search[updated_since]': updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'response.result.clients'
            },
            retries: 3
        })) {
            const mappedClients = [];
            let lastUpdatedAt: string | undefined;

            for (const item of page) {
                const parsed = RawClientSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse client: ${parsed.error.message}`);
                }
                const raw = parsed.data;

                const client = {
                    ...raw,
                    id: String(raw.id)
                };

                mappedClients.push(client);

                if (raw.updated) {
                    const formatted = formatUpdatedSince(raw.updated);
                    if (lastUpdatedAt === undefined || formatted > lastUpdatedAt) {
                        lastUpdatedAt = formatted;
                    }
                }
            }

            if (mappedClients.length === 0) {
                continue;
            }

            await nango.batchSave(mappedClients, 'Client');

            if (lastUpdatedAt) {
                await nango.saveCheckpoint({
                    updated_after: lastUpdatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
