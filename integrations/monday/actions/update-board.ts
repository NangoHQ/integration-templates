import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The board unique identifier. Example: "5096980653"'),
    board_attribute: z.enum(['name', 'description', 'communication', 'item_nickname']).describe('The board attribute to update'),
    new_value: z.string().describe('The new attribute value')
});

const BoardSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    state: z.string().optional(),
    board_kind: z.string().optional(),
    workspace_id: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    board_kind: z.string().optional(),
    workspace_id: z.string().optional(),
    updated_at: z.string().optional()
});

const MutationResponseSchema = z.object({
    data: z
        .object({
            update_board: z.unknown().optional()
        })
        .optional()
});

const QueryResponseSchema = z.object({
    data: z
        .object({
            boards: z.array(BoardSchema).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a board in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-board',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutationQuery = `
            mutation ($board_id: ID!, $board_attribute: BoardAttributes!, $new_value: String!) {
                update_board(board_id: $board_id, board_attribute: $board_attribute, new_value: $new_value)
            }
        `;

        // https://developer.monday.com/api-reference/reference/boards#update-board
        const mutationResponse = await nango.post({
            endpoint: '/v2',
            data: {
                query: mutationQuery,
                variables: {
                    board_id: input.board_id,
                    board_attribute: input.board_attribute,
                    new_value: input.new_value
                }
            },
            retries: 3
        });

        const boardQuery = `
            query ($board_id: ID!) {
                boards(ids: [$board_id]) {
                    id
                    name
                    description
                    state
                    board_kind
                    workspace_id
                    updated_at
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/boards#get-boards
        const queryResponse = await nango.post({
            endpoint: '/v2',
            data: {
                query: boardQuery,
                variables: {
                    board_id: input.board_id
                }
            },
            retries: 3
        });

        const mutationParsed = MutationResponseSchema.parse(mutationResponse.data);

        if (mutationParsed.data?.update_board === undefined) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Board update mutation did not return expected data',
                board_id: input.board_id
            });
        }

        const queryParsed = QueryResponseSchema.parse(queryResponse.data);
        const boards = queryParsed.data?.boards;

        if (!boards || boards.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Board not found after update',
                board_id: input.board_id
            });
        }

        const board = boards[0];

        if (!board) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Board not found after update',
                board_id: input.board_id
            });
        }

        return {
            id: board.id,
            ...(board.name != null && { name: board.name }),
            ...(board.description != null && { description: board.description }),
            ...(board.state != null && { state: board.state }),
            ...(board.board_kind != null && { board_kind: board.board_kind }),
            ...(board.workspace_id != null && { workspace_id: board.workspace_id }),
            ...(board.updated_at != null && { updated_at: board.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
