import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().optional().describe('Board ID to filter columns by. Example: "5096980653"'),
    limit: z.number().optional().describe('Maximum number of boards to retrieve per page.'),
    page: z.number().optional().describe('Page number for board pagination. Omit for the first page.')
});

const ProviderColumnSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    settings_str: z.string().optional()
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    columns: z.array(ProviderColumnSchema).optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            boards: z.array(ProviderBoardSchema).optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const ColumnSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    settings_str: z.string().optional(),
    board_id: z.string(),
    board_name: z.string()
});

const OutputSchema = z.object({
    columns: z.array(ColumnSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List columns from monday.com',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-columns',
        group: 'Columns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input) => {
        const query = `
            query ($ids: [ID!], $limit: Int, $page: Int) {
                boards(ids: $ids, limit: $limit, page: $page) {
                    id
                    name
                    columns {
                        id
                        title
                        type
                        settings_str
                    }
                }
            }
        `;

        const variables: { ids?: string[]; limit?: number; page?: number } = {};
        if (input.board_id !== undefined) {
            variables.ids = [input.board_id];
        }
        if (input.limit !== undefined) {
            variables.limit = input.limit;
        }
        if (input.page !== undefined) {
            variables.page = input.page;
        }

        // https://developer.monday.com/api-reference/reference/columns
        const response = await nango.post({
            endpoint: '/v2',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const firstError = parsed.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'api_error',
                message: firstError.message
            });
        }

        if (!parsed.data || !parsed.data.boards) {
            return { columns: [] };
        }

        const columns = [];
        for (const board of parsed.data.boards) {
            const boardColumns = board.columns || [];
            for (const col of boardColumns) {
                columns.push({
                    id: col.id,
                    title: col.title,
                    type: col.type,
                    ...(col.settings_str !== undefined && { settings_str: col.settings_str }),
                    board_id: board.id,
                    board_name: board.name
                });
            }
        }

        const currentPage = input.page || 1;
        const nextPage = input.limit !== undefined && parsed.data.boards.length === input.limit ? currentPage + 1 : undefined;

        return {
            columns: columns,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
