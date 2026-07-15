import { z } from 'zod';
import { createAction } from 'nango';

const SegmentStatusSchema = z.object({
    query_validation: z.string(),
    error_message: z.string().optional()
});

const SegmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    contacts_count: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    sample_updated_at: z.string().optional(),
    next_sample_update: z.string().optional(),
    parent_list_ids: z.array(z.string()).optional(),
    query_version: z.string().optional(),
    status: SegmentStatusSchema.optional()
});

const InputSchema = z.object({
    ids: z.array(z.string()).optional().describe('Segment IDs to retrieve. When included, other filters are ignored.'),
    parent_list_ids: z.string().optional().describe('Comma-separated list IDs to filter segments by parent list.'),
    no_parent_list_id: z.boolean().optional().describe('Include segments with no parent list ID.'),
    page_size: z.number().optional().describe('Requested page size. Not enforced live by this endpoint.')
});

const OutputSchema = z.object({
    results: z.array(SegmentSchema)
});

const action = createAction({
    description: 'List segments (Segmentation v2).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['marketing.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/segmenting-contacts-v2/get-list-of-segments
        const response = await nango.get({
            endpoint: '/v3/marketing/segments/2.0',
            params: {
                ...(input.ids !== undefined && input.ids.length > 0 && { ids: input.ids.join(',') }),
                ...(input.parent_list_ids !== undefined && input.parent_list_ids.length > 0 && { parent_list_ids: input.parent_list_ids }),
                ...(input.no_parent_list_id !== undefined && { no_parent_list_id: String(input.no_parent_list_id) }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const raw = response.data;

        if (typeof raw !== 'object' || raw === null || !('results' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from SendGrid segments API.'
            });
        }

        const providerResponse = z
            .object({
                results: z.array(z.unknown())
            })
            .parse(raw);

        const results = providerResponse.results.map((item: unknown) => {
            const segment = z
                .object({
                    id: z.string(),
                    name: z.string().nullable().optional(),
                    contacts_count: z.number(),
                    created_at: z.string().nullable().optional(),
                    updated_at: z.string().nullable().optional(),
                    sample_updated_at: z.string().nullable().optional(),
                    next_sample_update: z.string().nullable().optional(),
                    parent_list_ids: z.array(z.string()).nullable().optional(),
                    query_version: z.string().nullable().optional(),
                    status: z
                        .object({
                            query_validation: z.string(),
                            error_message: z.string().nullable().optional()
                        })
                        .nullable()
                        .optional()
                })
                .parse(item);

            return {
                id: segment.id,
                ...(segment.name != null && { name: segment.name }),
                contacts_count: segment.contacts_count,
                ...(segment.created_at != null && { created_at: segment.created_at }),
                ...(segment.updated_at != null && { updated_at: segment.updated_at }),
                ...(segment.sample_updated_at != null && { sample_updated_at: segment.sample_updated_at }),
                ...(segment.next_sample_update != null && { next_sample_update: segment.next_sample_update }),
                ...(segment.parent_list_ids != null && { parent_list_ids: segment.parent_list_ids }),
                ...(segment.query_version != null && { query_version: segment.query_version }),
                ...(segment.status != null && {
                    status: {
                        query_validation: segment.status.query_validation,
                        ...(segment.status.error_message != null && { error_message: segment.status.error_message })
                    }
                })
            };
        });

        return { results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
