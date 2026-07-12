import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Unique identifier of the Pinterest board. Example: "1099300658984851677"')
});

const OwnerSchema = z.object({
    username: z.string().nullable().optional(),
    id: z.string().nullable().optional()
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    owner: OwnerSchema.nullable().optional(),
    privacy: z.string().nullable().optional(),
    pin_count: z.number().nullable().optional(),
    follower_count: z.number().nullable().optional(),
    media: z.record(z.string(), z.unknown()).nullable().optional(),
    created_at: z.string().nullable().optional(),
    board_pins_modified_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    owner: OwnerSchema.optional(),
    privacy: z.string().optional(),
    pin_count: z.number().optional(),
    follower_count: z.number().optional(),
    media: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    board_pins_modified_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a board.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/boards/get
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Board not found',
                board_id: input.board_id
            });
        }

        const providerBoard = ProviderBoardSchema.parse(response.data);

        return {
            id: providerBoard.id,
            ...(providerBoard.name != null && { name: providerBoard.name }),
            ...(providerBoard.description != null && { description: providerBoard.description }),
            ...(providerBoard.owner != null && {
                owner: {
                    ...(providerBoard.owner.username != null && { username: providerBoard.owner.username }),
                    ...(providerBoard.owner.id != null && { id: providerBoard.owner.id })
                }
            }),
            ...(providerBoard.privacy != null && { privacy: providerBoard.privacy }),
            ...(providerBoard.pin_count != null && { pin_count: providerBoard.pin_count }),
            ...(providerBoard.follower_count != null && { follower_count: providerBoard.follower_count }),
            ...(providerBoard.media != null && { media: providerBoard.media }),
            ...(providerBoard.created_at != null && { created_at: providerBoard.created_at }),
            ...(providerBoard.board_pins_modified_at != null && { board_pins_modified_at: providerBoard.board_pins_modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
