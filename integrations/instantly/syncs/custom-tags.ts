import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCustomTagSchema = z.object({
    id: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    organization_id: z.string(),
    label: z.string(),
    color: z.string().optional(),
    description: z.string().nullable().optional()
});

const CustomTagSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    label: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync custom tags.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomTag: CustomTagSchema
    },
    // https://developer.instantly.ai/api-reference/groups/custom-tag
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/custom-tags'
        }
    ],

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

        // https://developer.instantly.ai/api-reference/groups/custom-tag
        // Provider only exposes /v2/custom-tags with no changed-since filter and no
        // deleted-record endpoint. Delete tracking is safe only after a complete
        // unfiltered crawl, so we checkpoint pagination progress and resume from the
        // saved cursor on subsequent executions.
        await nango.trackDeletesStart('CustomTag');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/custom-tag
            endpoint: '/v2/custom-tags',
            params: {
                ...(nextStartingAfter && { starting_after: nextStartingAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextStartingAfter = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const tags = page.map((record: unknown) => {
                const parsed = ProviderCustomTagSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid custom tag response: ${parsed.error.message}`);
                }
                const tag = parsed.data;
                return {
                    id: tag.id,
                    organization_id: tag.organization_id,
                    label: tag.label,
                    ...(tag.color !== undefined && { color: tag.color }),
                    ...(tag.description != null && { description: tag.description }),
                    ...(tag.timestamp_created !== undefined && { timestamp_created: tag.timestamp_created }),
                    ...(tag.timestamp_updated !== undefined && { timestamp_updated: tag.timestamp_updated })
                };
            });

            if (tags.length > 0) {
                await nango.batchSave(tags, 'CustomTag');
            }

            if (nextStartingAfter !== undefined) {
                await nango.saveCheckpoint({ starting_after: nextStartingAfter });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CustomTag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
