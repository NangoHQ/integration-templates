import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ListSchema = z.object({
    id: z.string().describe('The Klaviyo list ID, e.g. XW53Ha'),
    name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const KlaviyoListItemSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional().nullable(),
            created: z.string().optional().nullable(),
            updated: z.string().optional().nullable()
        })
        .optional()
});

const KlaviyoListsResponseSchema = z.object({
    data: z.array(z.unknown()),
    links: z
        .object({
            self: z.string().optional().nullable(),
            next: z.string().optional().nullable(),
            prev: z.string().optional().nullable()
        })
        .optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

function extractPageCursor(nextLink: string | number | null | undefined): string | undefined {
    if (typeof nextLink !== 'string') {
        return undefined;
    }
    const url = new URL(nextLink, 'https://a.klaviyo.com');
    const cursor = url.searchParams.get('page[cursor]');
    return cursor ?? undefined;
}

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
        const checkpoint = await nango.getCheckpoint();
        let cursor: string | undefined;

        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            cursor = parsedCheckpoint.data.cursor;
        }

        await nango.trackDeletesStart('List');

        let hasNextPage = true;

        while (hasNextPage) {
            const params: Record<string, string> = {
                'page[size]': '10'
            };

            if (cursor) {
                params['page[cursor]'] = cursor;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.klaviyo.com/en/reference/get_lists
                endpoint: '/api/lists',
                params,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);

            const parsedResponse = KlaviyoListsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse lists response: ${parsedResponse.error.message}`);
            }

            const items = parsedResponse.data.data;
            const nextLink = parsedResponse.data.links?.next;

            const lists = [];
            for (const raw of items) {
                const parsed = KlaviyoListItemSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse list item: ${parsed.error.message}`);
                }

                const item = parsed.data;
                lists.push({
                    id: item.id,
                    ...(item.attributes?.name != null && { name: item.attributes.name }),
                    ...(item.attributes?.created != null && { created: item.attributes.created }),
                    ...(item.attributes?.updated != null && { updated: item.attributes.updated })
                });
            }

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }

            const nextCursor = extractPageCursor(nextLink);
            if (nextCursor) {
                cursor = nextCursor;
                await nango.saveCheckpoint({ cursor });
            } else {
                hasNextPage = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
