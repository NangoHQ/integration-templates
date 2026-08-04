import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of notebooks to return per page. Defaults to 100.')
});

const NotebookAttributesSchema = z
    .object({
        name: z.string(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional(),
        author_name: z.string().optional(),
        author_handle: z.string().optional()
    })
    .passthrough();

const NotebookSchema = z
    .object({
        id: z.number(),
        type: z.string(),
        attributes: NotebookAttributesSchema
    })
    .passthrough();

const OutputSchema = z.object({
    notebooks: z.array(NotebookSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List notebooks in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset'
            });
        }
        const start = input.cursor ? parseInt(input.cursor, 10) : 0;
        const count = input.limit ?? 100;

        // https://docs.datadoghq.com/api/latest/notebooks/#get-all-notebooks
        // The "Get all notebooks" endpoint paginates with offset-based `start`/`count` query
        // params (not `cursor`), and reports totals via `meta.page.total_filtered_count`.
        const response = await nango.get({
            endpoint: 'v1/notebooks',
            params: {
                start: String(start),
                count: String(count)
            },
            retries: 3
        });

        const rawData = z
            .object({
                data: z.array(z.unknown()).optional(),
                meta: z
                    .object({
                        page: z
                            .object({
                                total_filtered_count: z.number().optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
            .parse(response.data);

        const notebooks = rawData.data ?? [];
        const totalFilteredCount = rawData.meta?.page?.total_filtered_count;
        const nextCursor = totalFilteredCount !== undefined && start + notebooks.length < totalFilteredCount ? String(start + notebooks.length) : undefined;

        return {
            notebooks: notebooks.map((item) => NotebookSchema.parse(item)),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
