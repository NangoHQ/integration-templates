import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const RevenueTypeSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        position: z.number().optional(),
        is_default: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(RevenueTypeSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List revenue types (e.g. New, Renewal) that can be assigned to a deal.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/revenue_types',
            params: {
                ...(input.cursor && { page: input.cursor })
            },
            retries: 3
        });

        const parsed = z
            .object({
                entries: z.array(z.unknown()),
                pagination: z.object({
                    page: z.number(),
                    pages: z.number(),
                    per_page: z.number(),
                    total: z.number()
                })
            })
            .parse(response.data);

        const rawItems = parsed.entries;
        const nextCursor = parsed.pagination.page < parsed.pagination.pages ? String(parsed.pagination.page + 1) : undefined;

        const items = rawItems.map((entry: unknown) => {
            const parsed = RevenueTypeSchema.parse(entry);
            return {
                id: parsed.id,
                ...(parsed.name !== undefined && { name: parsed.name }),
                ...(parsed.position !== undefined && { position: parsed.position }),
                ...(parsed.is_default !== undefined && { is_default: parsed.is_default }),
                ...(parsed.created_at !== undefined && { created_at: parsed.created_at }),
                ...(parsed.updated_at !== undefined && { updated_at: parsed.updated_at })
            };
        });

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
