import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().optional(),
    _metadata: z
        .object({
            self: z.string()
        })
        .optional()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().optional(),
    self_url: z.string().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const sync = createSync({
    description: 'Sync lists.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        List: ListSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let checkpoint: z.infer<typeof CheckpointSchema> | undefined;
        if (rawCheckpoint != null) {
            const parsed = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsed.success) {
                throw new Error(`Invalid checkpoint: ${parsed.error.message}`);
            }
            checkpoint = parsed.data;
        }

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('List');

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/lists/get-all-lists
            endpoint: '/v3/marketing/lists',
            params: {
                page_size: 100,
                ...(checkpoint?.page_token && { page_token: checkpoint.page_token })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: '_metadata.next',
                response_path: 'result',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        const url = new URL(nextPageParam, 'http://localhost');
                        const pageToken = url.searchParams.get('page_token');
                        if (pageToken) {
                            await nango.saveCheckpoint({ page_token: pageToken });
                        }
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from paginate');
            }

            const lists = page.map((record) => {
                const parsed = ProviderListSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse list: ${parsed.error.message}`);
                }

                const list = parsed.data;
                return {
                    id: list.id,
                    name: list.name,
                    ...(list.contact_count !== undefined && { contact_count: list.contact_count }),
                    ...(list._metadata?.self && { self_url: list._metadata.self })
                };
            });

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
