import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "5096980653"'),
    column_id: z.string().describe('Column ID. Example: "task_status"'),
    title: z.string().optional().describe('Updated column title'),
    description: z.string().optional().describe('Updated column description'),
    width: z.number().optional().describe('Updated column width in pixels')
});

const ProviderColumnSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string().nullable().optional(),
    width: z.number().nullable().optional(),
    revision: z.string().optional()
});

const ProviderBoardsQueryResponseSchema = z.object({
    data: z.object({
        boards: z
            .array(
                z.object({
                    columns: z.array(ProviderColumnSchema)
                })
            )
            .nullable()
            .optional()
    }),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const ProviderUpdateColumnResponseSchema = z.object({
    data: z.object({
        update_column: ProviderColumnSchema.nullable().optional()
    }),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    width: z.number().optional()
});

const action = createAction({
    description: 'Update a column in monday.com',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-column',
        group: 'Columns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.board_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'board_id must be a numeric string'
            });
        }

        if (input.column_id.includes('"')) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'column_id contains invalid characters'
            });
        }

        // https://developer.monday.com/api-reference/reference/columns
        const queryResponse = await nango.post({
            endpoint: '/v2',
            data: {
                query: `query { boards(ids: [${input.board_id}]) { columns(ids: ["${input.column_id}"]) { id title type description width revision } } }`
            },
            retries: 3
        });

        const queryResult = ProviderBoardsQueryResponseSchema.parse(queryResponse.data);

        const firstQueryError = queryResult.errors?.[0];
        if (firstQueryError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstQueryError.message
            });
        }

        const boards = queryResult.data.boards;
        if (!boards || boards.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board ${input.board_id} not found`
            });
        }

        const firstBoard = boards[0];
        if (!firstBoard) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board ${input.board_id} not found`
            });
        }

        const columns = firstBoard.columns;
        if (!columns || columns.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Column ${input.column_id} not found on board ${input.board_id}`
            });
        }

        const existingColumn = columns[0];
        if (!existingColumn) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Column ${input.column_id} not found on board ${input.board_id}`
            });
        }

        const mutationFields = [
            `board_id: ${input.board_id}`,
            `id: "${input.column_id}"`,
            `column_type: ${existingColumn.type}`,
            `revision: "${existingColumn.revision}"`
        ];

        if (input.title !== undefined) {
            mutationFields.push(`title: ${JSON.stringify(input.title)}`);
        }
        if (input.description !== undefined) {
            mutationFields.push(`description: ${JSON.stringify(input.description)}`);
        }
        if (input.width !== undefined) {
            mutationFields.push(`width: ${input.width}`);
        }

        const mutationQuery = `mutation { update_column(${mutationFields.join(', ')}) { id title description type width } }`;

        // https://developer.monday.com/api-reference/reference/columns
        const updateResponse = await nango.post({
            endpoint: '/v2',
            data: {
                query: mutationQuery
            },
            retries: 1
        });

        const updateResult = ProviderUpdateColumnResponseSchema.parse(updateResponse.data);

        const firstUpdateError = updateResult.errors?.[0];
        if (firstUpdateError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstUpdateError.message
            });
        }

        const updatedColumn = updateResult.data.update_column;
        if (!updatedColumn) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Update did not return a column'
            });
        }

        return {
            id: updatedColumn.id,
            ...(updatedColumn.title !== undefined && { title: updatedColumn.title }),
            ...(updatedColumn.type !== undefined && { type: updatedColumn.type }),
            ...(updatedColumn.description !== null && updatedColumn.description !== undefined && { description: updatedColumn.description }),
            ...(updatedColumn.width !== null && updatedColumn.width !== undefined && { width: updatedColumn.width })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
