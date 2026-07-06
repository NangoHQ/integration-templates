import { createSync, type ProxyConfiguration } from 'nango';
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

const sync = createSync({
    description: 'Sync segments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Segment: SegmentSchema
    },

    exec: async (nango) => {
        // Blocker: Klaviyo GET /api/segments does not expose an updated-since filter
        // that supports incremental sync, so full-refresh delete tracking is required.
        await nango.trackDeletesStart('Segment');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_segments
            endpoint: '/api/segments',
            headers: {
                revision: '2026-04-15'
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 10
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const segments = page.map((item: unknown) => {
                const parsed = KlaviyoSegmentItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse segment item: ${parsed.error.message}`);
                }

                const segment = parsed.data;
                const attributes = segment.attributes;

                return {
                    id: segment.id,
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
        }

        await nango.trackDeletesEnd('Segment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
