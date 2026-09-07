import { createSync } from 'nango';
import { z } from 'zod';

const SegmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    is_active: z.boolean().optional(),
    is_processing: z.boolean().optional(),
    is_starred: z.boolean().optional()
});

const KlaviyoSegmentItemSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional(),
            created: z.string().optional(),
            updated: z.string().optional(),
            is_active: z.boolean().optional(),
            is_processing: z.boolean().optional(),
            is_starred: z.boolean().optional()
        })
        .optional()
});

const KlaviyoListResponseSchema = z.object({
    data: z.array(KlaviyoSegmentItemSchema),
    links: z
        .object({
            next: z.string().nullable().optional(),
            self: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    state: z.string()
});

const CheckpointStateSchema = z.object({
    cursor: z.string().optional()
});

function extractCursor(nextUrl: string): string | undefined {
    // @allowTryCatch URL parsing may fail on malformed links from the provider
    try {
        const url = new URL(nextUrl);
        const cursor = url.searchParams.get('page[cursor]');
        return cursor ?? undefined;
    } catch {
        return undefined;
    }
}

const sync = createSync({
    description: 'Sync segments.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Segment: SegmentSchema
    },

    exec: async (nango) => {
        // Blocker: Klaviyo GET /api/segments does not expose an updated-since filter
        // that supports incremental sync, so full-refresh delete tracking is required.
        const checkpoint = await nango.getCheckpoint();

        let state: z.infer<typeof CheckpointStateSchema> = {};
        if (checkpoint?.state) {
            let parsed: unknown;
            // @allowTryCatch JSON.parse may throw on corrupted checkpoint state
            try {
                parsed = JSON.parse(checkpoint.state);
            } catch {
                throw new Error('Failed to parse checkpoint state');
            }
            const validated = CheckpointStateSchema.safeParse(parsed);
            if (!validated.success) {
                throw new Error(`Invalid checkpoint state: ${validated.error.message}`);
            }
            state = validated.data;
        }

        let cursor = state.cursor;

        await nango.trackDeletesStart('Segment');

        while (true) {
            const params: Record<string, string | number> = {
                'page[size]': 10
            };

            if (cursor) {
                params['page[cursor]'] = cursor;
            }

            // https://developers.klaviyo.com/en/reference/get_segments
            const response = await nango.get({
                endpoint: '/api/segments',
                params,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            });

            const validated = KlaviyoListResponseSchema.safeParse(response.data);
            if (!validated.success) {
                throw new Error(`Invalid response from Klaviyo segments API: ${validated.error.message}`);
            }

            const segments = validated.data.data.map((item) => {
                const attributes = item.attributes;

                return {
                    id: item.id,
                    ...(attributes?.name != null && { name: attributes.name }),
                    ...(attributes?.created != null && { created: attributes.created }),
                    ...(attributes?.updated != null && { updated: attributes.updated }),
                    ...(attributes?.is_active != null && { is_active: attributes.is_active }),
                    ...(attributes?.is_processing != null && { is_processing: attributes.is_processing }),
                    ...(attributes?.is_starred != null && { is_starred: attributes.is_starred })
                };
            });

            if (segments.length > 0) {
                await nango.batchSave(segments, 'Segment');
            }

            const nextUrl = validated.data.links?.next;
            if (!nextUrl) {
                await nango.clearCheckpoint();
                await nango.trackDeletesEnd('Segment');
                break;
            }

            const nextCursor = extractCursor(nextUrl);
            if (!nextCursor) {
                throw new Error('Failed to extract cursor from next page URL');
            }

            cursor = nextCursor;
            const nextState: z.infer<typeof CheckpointStateSchema> = { cursor };
            await nango.saveCheckpoint({ state: JSON.stringify(nextState) });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
