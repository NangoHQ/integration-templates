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

const sync = createSync({
    description: 'Sync custom tags.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
        // Blocker: provider only exposes /v2/custom-tags with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor that can be safely used
        // alongside delete tracking (delete tracking requires a complete unfiltered crawl
        // from page 1 every run).
        await nango.trackDeletesStart('CustomTag');

        // https://developer.instantly.ai/api-reference/groups/custom-tag
        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/custom-tag
            endpoint: '/v2/custom-tags',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
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
        }

        await nango.trackDeletesEnd('CustomTag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
