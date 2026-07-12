import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the board. Example: "Summer recipes"'),
    description: z.string().optional().describe('Description of the board. Example: "My favorite summer recipes"'),
    privacy: z
        .enum(['PUBLIC', 'SECRET', 'PROTECTED'])
        .optional()
        .describe('Privacy setting for the board. Defaults to PUBLIC. Use SECRET for a private board (requires the boards:write_secret scope).')
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    privacy: z.enum(['PUBLIC', 'SECRET', 'PROTECTED']),
    is_ads_only: z.boolean().optional(),
    pin_count: z.number().optional(),
    follower_count: z.number().optional(),
    collaborator_count: z.number().optional(),
    created_at: z.string().optional(),
    board_pins_modified_at: z.string().optional(),
    owner: z
        .object({
            username: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    privacy: z.enum(['PUBLIC', 'SECRET', 'PROTECTED']),
    is_ads_only: z.boolean().optional(),
    pin_count: z.number().optional(),
    follower_count: z.number().optional(),
    collaborator_count: z.number().optional(),
    created_at: z.string().optional(),
    board_pins_modified_at: z.string().optional(),
    owner: z
        .object({
            username: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a board.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'boards:write', 'boards:write_secret'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/boards/create
            endpoint: '/v5/boards',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.privacy !== undefined && { privacy: input.privacy })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Received empty response from Pinterest when creating board.'
            });
        }

        const providerBoard = ProviderBoardSchema.parse(response.data);

        return {
            id: providerBoard.id,
            name: providerBoard.name,
            ...(providerBoard.description != null && { description: providerBoard.description }),
            privacy: providerBoard.privacy,
            ...(providerBoard.is_ads_only !== undefined && { is_ads_only: providerBoard.is_ads_only }),
            ...(providerBoard.pin_count !== undefined && { pin_count: providerBoard.pin_count }),
            ...(providerBoard.follower_count !== undefined && { follower_count: providerBoard.follower_count }),
            ...(providerBoard.collaborator_count !== undefined && { collaborator_count: providerBoard.collaborator_count }),
            ...(providerBoard.created_at !== undefined && { created_at: providerBoard.created_at }),
            ...(providerBoard.board_pins_modified_at !== undefined && { board_pins_modified_at: providerBoard.board_pins_modified_at }),
            ...(providerBoard.owner !== undefined && {
                owner: {
                    ...(providerBoard.owner.username !== undefined && { username: providerBoard.owner.username })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
