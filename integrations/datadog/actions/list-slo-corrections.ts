import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of SLO corrections to return. Defaults to 25.')
});

const CreatorSchema = z.object({
    email: z.string().optional(),
    handle: z.string().optional(),
    name: z.string().optional()
});

const ModifierSchema = z.object({
    email: z.string().optional(),
    handle: z.string().optional(),
    name: z.string().optional()
});

const SloCorrectionSchema = z.object({
    id: z.string(),
    type: z.literal('correction'),
    category: z.string(),
    description: z.string().optional(),
    duration: z.number().int().optional(),
    end: z.number().int().optional(),
    start: z.number().int(),
    timezone: z.string().optional(),
    slo_id: z.string().optional(),
    slo_query: z.string().optional(),
    rrule: z.string().optional(),
    created_at: z.number().int().optional(),
    modified_at: z.number().int().optional(),
    creator: CreatorSchema.optional(),
    modifier: ModifierSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(SloCorrectionSchema),
    next_cursor: z.string().optional(),
    total_count: z.number().int().optional(),
    total_filtered_count: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            type: z.literal('correction'),
            attributes: z.object({
                category: z.string(),
                created_at: z.number().int().nullable().optional(),
                creator: CreatorSchema.nullable().optional(),
                description: z.string().optional(),
                duration: z.number().int().nullable().optional(),
                end: z.number().int().nullable().optional(),
                modified_at: z.number().int().nullable().optional(),
                modifier: ModifierSchema.nullable().optional(),
                rrule: z.string().nullable().optional(),
                slo_id: z.string().nullable().optional(),
                slo_query: z.string().nullable().optional(),
                start: z.number().int(),
                timezone: z.string().optional()
            })
        })
    ),
    meta: z
        .object({
            page: z
                .object({
                    total_count: z.number().int().optional(),
                    total_filtered_count: z.number().int().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: "List SLO corrections (time windows excluded from an SLO's error-budget calculation, e.g. for planned maintenance).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slos_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let offset = 0;
        if (input.cursor) {
            const parsed = parseInt(input.cursor, 10);
            if (Number.isNaN(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a non-negative integer string'
                });
            }
            offset = parsed;
        }

        const limit = input.limit ?? 25;

        // https://docs.datadoghq.com/api/latest/slo-corrections/
        const response = await nango.get({
            endpoint: 'v1/slo/correction',
            params: {
                offset: String(offset),
                limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => ({
            id: item.id,
            type: item.type,
            category: item.attributes.category,
            ...(item.attributes.description !== undefined && {
                description: item.attributes.description
            }),
            ...(item.attributes.duration != null && {
                duration: item.attributes.duration
            }),
            ...(item.attributes.end != null && { end: item.attributes.end }),
            start: item.attributes.start,
            ...(item.attributes.timezone !== undefined && {
                timezone: item.attributes.timezone
            }),
            ...(item.attributes.slo_id != null && { slo_id: item.attributes.slo_id }),
            ...(item.attributes.slo_query != null && {
                slo_query: item.attributes.slo_query
            }),
            ...(item.attributes.rrule != null && { rrule: item.attributes.rrule }),
            ...(item.attributes.created_at != null && {
                created_at: item.attributes.created_at
            }),
            ...(item.attributes.modified_at != null && {
                modified_at: item.attributes.modified_at
            }),
            ...(item.attributes.creator != null && {
                creator: item.attributes.creator
            }),
            ...(item.attributes.modifier != null && {
                modifier: item.attributes.modifier
            })
        }));

        const totalFilteredCount = providerResponse.meta?.page?.total_filtered_count;
        const totalCount = providerResponse.meta?.page?.total_count;
        const nextOffset = offset + items.length;
        const nextCursor = totalFilteredCount !== undefined && nextOffset < totalFilteredCount ? String(nextOffset) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            ...(totalCount !== undefined && { total_count: totalCount }),
            ...(totalFilteredCount !== undefined && {
                total_filtered_count: totalFilteredCount
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
