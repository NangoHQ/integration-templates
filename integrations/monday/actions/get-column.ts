import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The board ID. Example: "5096980653"'),
    column_id: z.string().describe('The column ID. Example: "task_status"')
});

const ProviderColumnSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    width: z.number().nullable().optional(),
    settings: z.unknown().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            boards: z
                .array(
                    z.object({
                        columns: z.array(ProviderColumnSchema)
                    })
                )
                .nullish()
        })
        .nullish(),
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

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string().optional(),
    archived: z.boolean().optional(),
    width: z.number().optional(),
    settings: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve a single column from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-column',
        group: 'Columns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `query ($boardIds: [ID!], $columnIds: [String]) {
    boards(ids: $boardIds) {
        columns(ids: $columnIds) {
            id
            title
            type
            description
            archived
            width
            settings
        }
    }
}`;

        const config: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs/columns
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query,
                variables: {
                    boardIds: [input.board_id],
                    columnIds: [input.column_id]
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const body = ProviderResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            const firstError = body.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message,
                    code: firstError.extensions?.code
                });
            }
        }

        const boards = body.data?.boards;
        if (!boards || boards.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Board not found',
                board_id: input.board_id
            });
        }

        const board = boards[0];
        if (!board) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Board not found',
                board_id: input.board_id
            });
        }

        const columns = board.columns;
        if (!columns || columns.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Column not found',
                column_id: input.column_id
            });
        }

        const column = columns[0];
        if (!column) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Column not found',
                column_id: input.column_id
            });
        }

        return {
            id: column.id,
            title: column.title,
            type: column.type,
            ...(column.description != null && { description: column.description }),
            ...(column.archived !== undefined && { archived: column.archived }),
            ...(column.width != null && { width: column.width }),
            ...(column.settings != null && { settings: column.settings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
