import { z } from 'zod';
import { createAction } from 'nango';

const DuplicateBoardTypeSchema = z.enum(['duplicate_board_with_structure', 'duplicate_board_with_pulses', 'duplicate_board_with_pulses_and_updates']);

const InputSchema = z.object({
    board_id: z.string().describe('The ID of the board to duplicate. Example: "5096980653"'),
    duplicate_type: DuplicateBoardTypeSchema.describe('The type of duplication to perform.'),
    board_name: z.string().optional().describe('The name for the duplicated board.'),
    workspace_id: z.string().optional().describe('The workspace ID to place the duplicated board in.'),
    folder_id: z.string().optional().describe('The folder ID to place the duplicated board in.'),
    keep_subscribers: z.boolean().optional().describe('Whether to keep subscribers on the duplicated board.')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            duplicate_board: z
                .object({
                    board: z
                        .object({
                            id: z.string(),
                            name: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Duplicate a board in monday.com.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const args: string[] = [`board_id: ${input.board_id}`, `duplicate_type: ${input.duplicate_type}`];

        if (input.board_name !== undefined) {
            args.push(`board_name: ${JSON.stringify(input.board_name)}`);
        }
        if (input.workspace_id !== undefined) {
            args.push(`workspace_id: ${input.workspace_id}`);
        }
        if (input.folder_id !== undefined) {
            args.push(`folder_id: ${input.folder_id}`);
        }
        if (input.keep_subscribers !== undefined) {
            args.push(`keep_subscribers: ${input.keep_subscribers}`);
        }

        const query = `mutation { duplicate_board(${args.join(', ')}) { board { id name } } }`;

        const response = await nango.post({
            // https://developer.monday.com/api-reference/reference/boards#duplicate-a-board
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: query
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message
                });
            }
        }

        const board = parsed.data?.duplicate_board?.board;
        if (!board) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Board duplication failed: no board returned.'
            });
        }

        return {
            id: board.id,
            ...(board.name !== undefined && { name: board.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
