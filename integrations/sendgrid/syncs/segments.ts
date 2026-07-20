import { createSync } from 'nango';
import { z } from 'zod';

const SegmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    query_dsl: z.string().optional(),
    contacts_count: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    sample_updated_at: z.string().optional(),
    next_sample_update: z.string().optional(),
    parent_list_ids: z.array(z.string()).nullable().optional(),
    query_version: z.string().optional(),
    status: z
        .object({
            query_validation: z.string(),
            error_message: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    results: z.array(SegmentSchema)
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
        // Blocker: GET /v3/marketing/segments/2.0 returns all segments in a single
        // response with no updated_after, modified_since, cursor, or page token
        // support. page_size is accepted but not enforced live. This is inherently
        // a small full snapshot.

        // https://www.twilio.com/docs/sendgrid/api-reference/segmenting-contacts-v2/get-list-of-segments
        const response = await nango.get({
            endpoint: '/v3/marketing/segments/2.0',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse segments response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Segment');

        const segments = parsed.data.results.map((segment) => ({
            id: segment.id,
            name: segment.name,
            ...(segment.query_dsl != null && { query_dsl: segment.query_dsl }),
            ...(segment.contacts_count != null && { contacts_count: segment.contacts_count }),
            ...(segment.created_at != null && { created_at: segment.created_at }),
            ...(segment.updated_at != null && { updated_at: segment.updated_at }),
            ...(segment.sample_updated_at != null && { sample_updated_at: segment.sample_updated_at }),
            ...(segment.next_sample_update != null && { next_sample_update: segment.next_sample_update }),
            ...(segment.parent_list_ids != null && { parent_list_ids: segment.parent_list_ids }),
            ...(segment.query_version != null && { query_version: segment.query_version }),
            ...(segment.status != null && { status: segment.status })
        }));

        if (segments.length > 0) {
            await nango.batchSave(segments, 'Segment');
        }

        await nango.trackDeletesEnd('Segment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
