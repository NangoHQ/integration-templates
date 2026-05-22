import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The ID of the board to add the column to. Example: "5096980653"'),
    title: z.string().describe('The display title for the new column.'),
    column_type: z.string().describe('The type of column to create. Example: "text", "status", "numbers"'),
    description: z.string().optional().describe('An optional description shown in the column header tooltip.')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        create_column: z
            .object({
                id: z.string(),
                title: z.string(),
                type: z.string(),
                description: z.string().nullable().optional()
            })
            .nullable()
            .optional()
    }),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Create a column in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-column',
        group: 'Columns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation ($boardId: ID!, $title: String!, $columnType: ColumnType!, $description: String) {
                create_column(board_id: $boardId, title: $title, column_type: $columnType, description: $description) {
                    id
                    title
                    type
                    description
                }
            }
        `;

        // https://developer.monday.com/api-reference/docs/create-column
        const response = await nango.post({
            endpoint: '/v2',
            data: {
                query,
                variables: {
                    boardId: input.board_id,
                    title: input.title,
                    columnType: input.column_type,
                    ...(input.description !== undefined && { description: input.description })
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const error = parsed.errors[0];
            if (error) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: error.message,
                    errors: parsed.errors
                });
            }
        }

        const column = parsed.data.create_column;

        if (!column) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create column'
            });
        }

        return {
            id: column.id,
            title: column.title,
            type: column.type,
            ...(column.description != null && { description: column.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
