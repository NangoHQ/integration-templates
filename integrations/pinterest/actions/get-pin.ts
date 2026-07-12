import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pin_id: z.string().describe('The unique identifier of the Pin to retrieve. Example: "1099300590356451849"')
});

const ProviderPinSchema = z
    .object({
        id: z.string().describe('The unique identifier of the Pin.'),
        created_at: z.string().optional().describe('The date and time the Pin was created in ISO 8601 format.'),
        link: z.string().nullish().describe('The URL the Pin links to.'),
        title: z.string().nullish().describe('The title of the Pin.'),
        description: z.string().nullish().describe('The description of the Pin.'),
        alt_text: z.string().nullish().describe('The alt text for the Pin image.'),
        board_id: z.string().nullish().describe('The unique identifier of the board the Pin is on.'),
        board_section_id: z.string().nullish().describe('The unique identifier of the board section the Pin is in.'),
        parent_pin_id: z.string().nullish().describe('The unique identifier of the parent Pin if this is a repin.'),
        is_standard: z.boolean().nullish().describe('Whether the Pin is a standard Pin.'),
        has_been_promoted: z.boolean().nullish().describe('Whether the Pin has been promoted before.'),
        media: z
            .object({
                media_type: z.string().nullish(),
                images: z.record(z.string(), z.unknown()).nullish()
            })
            .nullish()
            .describe('Media metadata for the Pin.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the Pin.'),
        created_at: z.string().optional().describe('The date and time the Pin was created in ISO 8601 format.'),
        link: z.string().optional().describe('The URL the Pin links to.'),
        title: z.string().optional().describe('The title of the Pin.'),
        description: z.string().optional().describe('The description of the Pin.'),
        alt_text: z.string().optional().describe('The alt text for the Pin image.'),
        board_id: z.string().optional().describe('The unique identifier of the board the Pin is on.'),
        board_section_id: z.string().optional().describe('The unique identifier of the board section the Pin is in.'),
        parent_pin_id: z.string().optional().describe('The unique identifier of the parent Pin if this is a repin.'),
        is_standard: z.boolean().optional().describe('Whether the Pin is a standard Pin.'),
        has_been_promoted: z.boolean().optional().describe('Whether the Pin has been promoted before.'),
        media: z
            .object({
                media_type: z.string().optional(),
                images: z.record(z.string(), z.unknown()).optional()
            })
            .optional()
            .describe('Media metadata for the Pin.')
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a Pin.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/pins/get
        const response = await nango.get({
            endpoint: `/v5/pins/${encodeURIComponent(input.pin_id)}`,
            retries: 3
        });

        const providerPin = ProviderPinSchema.parse(response.data);

        const output: Record<string, unknown> = {
            id: providerPin.id,
            ...(providerPin.created_at !== undefined && { created_at: providerPin.created_at }),
            ...(providerPin.link != null && { link: providerPin.link }),
            ...(providerPin.title != null && { title: providerPin.title }),
            ...(providerPin.description != null && { description: providerPin.description }),
            ...(providerPin.alt_text != null && { alt_text: providerPin.alt_text }),
            ...(providerPin.board_id != null && { board_id: providerPin.board_id }),
            ...(providerPin.board_section_id != null && { board_section_id: providerPin.board_section_id }),
            ...(providerPin.parent_pin_id != null && { parent_pin_id: providerPin.parent_pin_id }),
            ...(providerPin.is_standard != null && { is_standard: providerPin.is_standard }),
            ...(providerPin.has_been_promoted != null && { has_been_promoted: providerPin.has_been_promoted })
        };

        if (providerPin.media != null) {
            output['media'] = {
                ...(providerPin.media.media_type != null && { media_type: providerPin.media.media_type }),
                ...(providerPin.media.images != null && { images: providerPin.media.images })
            };
        }

        // Pass through any unknown provider fields
        const knownKeys = new Set([
            'id',
            'created_at',
            'link',
            'title',
            'description',
            'alt_text',
            'board_id',
            'board_section_id',
            'parent_pin_id',
            'is_standard',
            'has_been_promoted',
            'media'
        ]);

        for (const [key, value] of Object.entries(providerPin)) {
            if (!knownKeys.has(key) && value !== undefined) {
                output[key] = value;
            }
        }

        return OutputSchema.parse(output);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
