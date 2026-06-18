import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category: z.string().optional().describe('If specified, only returns annotations in this category.'),
    chart_id: z.string().optional().describe('If specified, only returns annotations that show on this chart.'),
    start: z.string().optional().describe('ISO 8601 timestamp. Only returns annotations that occur after this time.'),
    end: z.string().optional().describe('ISO 8601 timestamp. Only returns annotations that occur before this time.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of annotations to return per page. Defaults to 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    category: z.string().nullish()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    start: z.string(),
    details: z.string().nullish(),
    category: ProviderCategorySchema.nullish(),
    end: z.string().nullish(),
    label: z.string(),
    chart_id: z.string().nullish()
});

const AnnotationSchema = z.object({
    id: z.number(),
    start: z.string(),
    details: z.string().optional(),
    category: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    end: z.string().optional(),
    label: z.string(),
    chart_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(AnnotationSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List chart annotations.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-annotations',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const offset = input.cursor !== undefined ? Number(input.cursor) : 0;
        if (!Number.isInteger(offset) || offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor value. Cursor must be a non-negative integer.'
            });
        }

        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/chart-annotations#get-all-annotations
            endpoint: '/api/3/annotations',
            params: {
                ...(input.category !== undefined && { category: input.category }),
                ...(input.chart_id !== undefined && { chart_id: input.chart_id }),
                ...(input.start !== undefined && { start: input.start }),
                ...(input.end !== undefined && { end: input.end })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(ProviderAnnotationSchema)
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const allItems = providerResponse.data;
        const paginatedItems = allItems.slice(offset, offset + limit);
        const hasMore = offset + limit < allItems.length;
        const nextCursor = hasMore ? String(offset + limit) : undefined;

        return {
            items: paginatedItems.map((item) => ({
                id: item.id,
                start: item.start,
                ...(item.details != null && { details: item.details }),
                ...(item.category != null && {
                    category: {
                        id: item.category.id,
                        ...((item.category.name != null || item.category.category != null) && {
                            name: item.category.name ?? item.category.category ?? undefined
                        })
                    }
                }),
                ...(item.end != null && { end: item.end }),
                label: item.label,
                ...(item.chart_id != null && { chart_id: item.chart_id })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            has_more: hasMore
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
