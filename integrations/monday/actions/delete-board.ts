import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The unique identifier of the board to delete or archive. Example: "5096980653"'),
    permanent: z.boolean().optional().describe('If true, permanently deletes the board. If false or omitted, archives the board.')
});

const ProviderBoardsQuerySchema = z.object({
    data: z.object({
        boards: z.array(
            z.object({
                id: z.string(),
                state: z.string().optional()
            })
        )
    })
});

const ProviderMutationSchema = z.object({
    data: z.object({
        archive_board: z
            .object({
                id: z.string(),
                state: z.string().optional()
            })
            .optional(),
        delete_board: z
            .object({
                id: z.string(),
                state: z.string().optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    state: z.string().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a board in monday.com.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.board_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'board_id must be a numeric string'
            });
        }

        // Verify the board exists before attempting to delete or archive.
        // https://developer.monday.com/api-reference/reference/boards#query-boards
        const verifyResponse = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `query { boards(ids: ${input.board_id}) { id state } }`
            },
            retries: 3
        });

        const verifyParsed = ProviderBoardsQuerySchema.safeParse(verifyResponse.data);
        if (!verifyParsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from monday.com API.',
                board_id: input.board_id
            });
        }
        if (verifyParsed.data.data.boards.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board with ID ${input.board_id} not found.`,
                board_id: input.board_id
            });
        }

        const mutation = input.permanent === true ? 'delete_board' : 'archive_board';

        // https://developer.monday.com/api-reference/reference/boards#archive-board
        // https://developer.monday.com/api-reference/reference/boards#delete-board
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `mutation { ${mutation}(board_id: ${input.board_id}) { id state } }`
            },
            retries: 1
        });

        const parsed = ProviderMutationSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to ${mutation.replace('_', ' ')} board: unexpected response format.`,
                board_id: input.board_id
            });
        }

        const result = parsed.data.data[mutation];
        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to ${mutation.replace('_', ' ')} board: no result returned.`,
                board_id: input.board_id
            });
        }

        return {
            id: result.id,
            ...(result.state !== undefined && { state: result.state }),
            archived: input.permanent !== true,
            deleted: input.permanent === true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
