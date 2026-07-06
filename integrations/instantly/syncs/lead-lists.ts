import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderLeadListSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    has_enrichment_task: z.boolean().nullable().optional(),
    owned_by: z.string().nullable().optional(),
    name: z.string(),
    timestamp_created: z.string()
});

const LeadListSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    has_enrichment_task: z.boolean().optional(),
    owned_by: z.string().optional(),
    name: z.string(),
    timestamp_created: z.string()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync lead lists.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://developer.instantly.ai/api-reference/leadlist/list-lead-list
    endpoints: [{ method: 'GET', path: '/syncs/lead-lists' }],
    models: {
        LeadList: LeadListSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextStartingAfter: string | undefined;
        if (checkpoint !== undefined && checkpoint !== null) {
            const validatedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!validatedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${validatedCheckpoint.error.message}`);
            }
            nextStartingAfter = validatedCheckpoint.data.starting_after;
        }

        // https://developer.instantly.ai/api-reference/leadlist/list-lead-list
        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/leadlist/list-lead-list
            endpoint: '/v2/lead-lists',
            params: {
                limit: 5,
                ...(nextStartingAfter && { starting_after: nextStartingAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 5,
                on_page: async ({ nextPageParam }) => {
                    nextStartingAfter = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const records = z.array(ProviderLeadListSchema).safeParse(page);
            if (!records.success) {
                throw new Error(`Failed to parse lead lists page: ${records.error.message}`);
            }

            const leadLists = records.data.map((record) => ({
                id: record.id,
                organization_id: record.organization_id,
                ...(record.has_enrichment_task != null && { has_enrichment_task: record.has_enrichment_task }),
                ...(record.owned_by != null && { owned_by: record.owned_by }),
                name: record.name,
                timestamp_created: record.timestamp_created
            }));

            if (leadLists.length > 0) {
                await nango.batchSave(leadLists, 'LeadList');
            }

            if (nextStartingAfter !== undefined) {
                await nango.saveCheckpoint({ starting_after: nextStartingAfter });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
