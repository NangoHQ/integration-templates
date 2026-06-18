import { z } from 'zod';
import { createAction } from 'nango';

const SegmentConditionSchema = z.object({
    condition_type: z.string().optional(),
    field: z.string().optional(),
    op: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    extra: z.string().optional()
});

const SegmentOptionsSchema = z.object({
    match: z.enum(['any', 'all']).optional(),
    conditions: z.array(SegmentConditionSchema).optional()
});

const ProviderSegmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    member_count: z.number(),
    type: z.enum(['saved', 'static', 'fuzzy']).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    options: SegmentOptionsSchema.optional()
});

const ProviderResponseSchema = z.object({
    segments: z.array(ProviderSegmentSchema),
    total_items: z.number().optional()
});

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4"'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    count: z.number().max(1000).optional().describe('The number of records to return. Default value is 10. Maximum value is 1000.'),
    type: z.string().optional().describe('Limit results based on segment type.'),
    exclude_type: z.enum(['saved', 'static', 'fuzzy']).optional().describe('Exclude results based on segment type.'),
    since_created_at: z.string().optional().describe('Restrict results to segments created after the set time. Uses ISO 8601 time format.'),
    before_created_at: z.string().optional().describe('Restrict results to segments created before the set time. Uses ISO 8601 time format.'),
    since_updated_at: z.string().optional().describe('Restrict results to segments updated after the set time. Uses ISO 8601 time format.'),
    before_updated_at: z.string().optional().describe('Restrict results to segments updated before the set time. Uses ISO 8601 time format.'),
    include_cleaned: z.boolean().optional().describe('Include cleaned members in response.'),
    include_transactional: z.boolean().optional().describe('Include transactional members in response.'),
    include_unsubscribed: z.boolean().optional().describe('Include unsubscribed members in response.')
});

const SegmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    member_count: z.number(),
    type: z.enum(['saved', 'static', 'fuzzy']).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    options: SegmentOptionsSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(SegmentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List segments from Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? (/^\d+$/.test(input.cursor) ? parseInt(input.cursor, 10) : NaN) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string representing an offset'
            });
        }

        // https://mailchimp.com/developer/marketing/api/list-segments/list-segments/
        const response = await nango.get({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/segments`,
            params: {
                offset,
                ...(input.count !== undefined && { count: input.count }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.exclude_type !== undefined && { exclude_type: input.exclude_type }),
                ...(input.since_created_at !== undefined && { since_created_at: input.since_created_at }),
                ...(input.before_created_at !== undefined && { before_created_at: input.before_created_at }),
                ...(input.since_updated_at !== undefined && { since_updated_at: input.since_updated_at }),
                ...(input.before_updated_at !== undefined && { before_updated_at: input.before_updated_at }),
                ...(input.include_cleaned !== undefined && { include_cleaned: String(input.include_cleaned) }),
                ...(input.include_transactional !== undefined && { include_transactional: String(input.include_transactional) }),
                ...(input.include_unsubscribed !== undefined && { include_unsubscribed: String(input.include_unsubscribed) })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = providerData.segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            member_count: segment.member_count,
            ...(segment.type !== undefined && { type: segment.type }),
            ...(segment.created_at !== undefined && { created_at: segment.created_at }),
            ...(segment.updated_at !== undefined && { updated_at: segment.updated_at }),
            ...(segment.options !== undefined && { options: segment.options })
        }));

        const totalItems = providerData.total_items ?? 0;
        const nextOffset = offset + items.length;
        const hasMore = nextOffset < totalItems && items.length > 0;

        return {
            items,
            ...(hasMore && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
