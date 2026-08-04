import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
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
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/notebooks/
            endpoint: 'v1/notebooks',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const rawData = z
            .object({
                data: z.array(z.unknown()).optional(),
                meta: z.object({}).passthrough().optional()
            })
            .passthrough()
            .parse(response.data);

        const notebooks = rawData.data ?? [];

        return {
            notebooks: notebooks.map((item) => NotebookSchema.parse(item)),
            next_cursor: undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
