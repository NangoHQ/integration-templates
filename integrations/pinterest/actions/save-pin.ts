import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pin_id: z.string().describe('The ID of the existing Pin to save. Example: "1099300590356451849"'),
    board_id: z.string().describe('The ID of the board to save the Pin to. Example: "1099300658984851677"'),
    board_section_id: z.string().optional().describe('The ID of the board section to save the Pin to. Example: "3662612923485353472"')
});

const ProviderPinSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    link: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    alt_text: z.string().nullable().optional(),
    board_id: z.string().optional(),
    board_section_id: z.string().nullable().optional(),
    parent_pin_id: z.string().nullable().optional(),
    is_owner: z.boolean().optional(),
    has_been_promoted: z.boolean().optional(),
    media: z
        .object({
            images: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    link: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    alt_text: z.string().optional(),
    board_id: z.string().optional(),
    board_section_id: z.string().optional(),
    parent_pin_id: z.string().optional(),
    is_owner: z.boolean().optional(),
    has_been_promoted: z.boolean().optional(),
    media: z
        .object({
            images: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Save (repin) an existing pin to one of your boards.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read', 'pins:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#tag/pins/operation/pins_save
            endpoint: `/v5/pins/${encodeURIComponent(input.pin_id)}/save`,
            data: {
                board_id: input.board_id,
                ...(input.board_section_id !== undefined && { board_section_id: input.board_section_id })
            },
            retries: 10
        });

        const providerPin = ProviderPinSchema.parse(response.data);

        return {
            id: providerPin.id,
            ...(providerPin.created_at !== undefined && { created_at: providerPin.created_at }),
            ...(providerPin.link != null && { link: providerPin.link }),
            ...(providerPin.title != null && { title: providerPin.title }),
            ...(providerPin.description != null && { description: providerPin.description }),
            ...(providerPin.alt_text != null && { alt_text: providerPin.alt_text }),
            ...(providerPin.board_id !== undefined && { board_id: providerPin.board_id }),
            ...(providerPin.board_section_id != null && { board_section_id: providerPin.board_section_id }),
            ...(providerPin.parent_pin_id != null && { parent_pin_id: providerPin.parent_pin_id }),
            ...(providerPin.is_owner !== undefined && { is_owner: providerPin.is_owner }),
            ...(providerPin.has_been_promoted !== undefined && { has_been_promoted: providerPin.has_been_promoted }),
            ...(providerPin.media !== undefined && { media: providerPin.media })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
