import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        board_id: z.string().describe('The unique identifier of the board to update. Example: "1099300658984851679"'),
        name: z.string().optional().describe('New name for the board.'),
        description: z.string().nullable().optional().describe('New description for the board. Pass null to clear.'),
        privacy: z.enum(['PUBLIC', 'SECRET']).optional().describe('New privacy setting for the board.')
    })
    .refine((input) => input.name !== undefined || input.description !== undefined || input.privacy !== undefined, {
        message: 'At least one of name, description, or privacy must be provided.'
    });

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    owner: z.record(z.string(), z.unknown()).optional(),
    privacy: z.string(),
    slug: z.string().optional(),
    created_at: z.string().optional(),
    pin_count: z.number().optional(),
    follower_count: z.number().optional(),
    collaborator_count: z.number().optional(),
    media: z.record(z.string(), z.unknown()).optional(),
    image_cover_url: z.string().nullable().optional(),
    is_collaborative: z.boolean().optional(),
    is_employee_owned: z.boolean().optional(),
    is_magical: z.boolean().optional(),
    url: z.string().optional(),
    view_permission: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    owner: z.record(z.string(), z.unknown()).optional(),
    privacy: z.string(),
    slug: z.string().optional(),
    created_at: z.string().optional(),
    pin_count: z.number().optional(),
    follower_count: z.number().optional(),
    collaborator_count: z.number().optional(),
    media: z.record(z.string(), z.unknown()).optional(),
    image_cover_url: z.string().optional(),
    is_collaborative: z.boolean().optional(),
    is_employee_owned: z.boolean().optional(),
    is_magical: z.boolean().optional(),
    url: z.string().optional(),
    view_permission: z.string().optional()
});

const action = createAction({
    description: 'Update a board.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.privacy !== undefined ? { privacy: input.privacy } : {})
        };

        const patchConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/boards/patch_boards_board_id
            endpoint: '/v5/boards/' + encodeURIComponent(input.board_id),
            data,
            retries: 3
        };

        const response = await nango.patch(patchConfig);

        const providerBoard = ProviderBoardSchema.parse(response.data);

        return {
            id: providerBoard.id,
            name: providerBoard.name,
            ...(providerBoard.description != null && { description: providerBoard.description }),
            ...(providerBoard.owner !== undefined && { owner: providerBoard.owner }),
            privacy: providerBoard.privacy,
            ...(providerBoard.slug !== undefined && { slug: providerBoard.slug }),
            ...(providerBoard.created_at !== undefined && { created_at: providerBoard.created_at }),
            ...(providerBoard.pin_count !== undefined && { pin_count: providerBoard.pin_count }),
            ...(providerBoard.follower_count !== undefined && { follower_count: providerBoard.follower_count }),
            ...(providerBoard.collaborator_count !== undefined && { collaborator_count: providerBoard.collaborator_count }),
            ...(providerBoard.media !== undefined && { media: providerBoard.media }),
            ...(providerBoard.image_cover_url != null && { image_cover_url: providerBoard.image_cover_url }),
            ...(providerBoard.is_collaborative !== undefined && { is_collaborative: providerBoard.is_collaborative }),
            ...(providerBoard.is_employee_owned !== undefined && { is_employee_owned: providerBoard.is_employee_owned }),
            ...(providerBoard.is_magical !== undefined && { is_magical: providerBoard.is_magical }),
            ...(providerBoard.url !== undefined && { url: providerBoard.url }),
            ...(providerBoard.view_permission != null && { view_permission: providerBoard.view_permission })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
