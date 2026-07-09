import { z } from 'zod';
import { createAction } from 'nango';

const PinSchema = z.object({
    id: z.string().describe('Unique identifier of the Pin. Example: "1234567890123456789"'),
    title: z.string().optional().nullable().describe('Title of the Pin.'),
    description: z.string().optional().nullable().describe('Description of the Pin.'),
    link: z.string().optional().nullable().describe('Link attached to the Pin.'),
    alt_text: z.string().optional().nullable().describe('Alt text for the Pin media.'),
    board_id: z.string().optional().describe('The board to which this Pin belongs.'),
    board_section_id: z.string().optional().nullable().describe('The board section to which this Pin belongs.'),
    created_at: z.string().optional().describe('Creation time of the Pin.'),
    creative_type: z.string().optional().nullable().describe('Creative type of the Pin.'),
    dominant_color: z.string().optional().nullable().describe('Dominant pin color.'),
    has_been_promoted: z.boolean().optional().describe('Whether the Pin has been promoted.'),
    is_owner: z.boolean().optional().describe('Whether the operation user_account is the Pin owner.'),
    is_product: z.boolean().optional().describe('Whether the Pin is a product Pin.'),
    is_standard: z.boolean().optional().describe('Whether the Pin is standard or not.'),
    parent_pin_id: z.string().optional().nullable().describe('The source pin id if this pin was saved from another pin.'),
    media: z.unknown().optional().nullable().describe('Pin media that can be an image, video, or a mix of both.')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    board_id: z.string().optional().describe('Optional board ID to filter pins by board.'),
    pin_filter: z.enum(['exclude_native', 'exclude_repins', 'has_been_promoted']).optional().describe('Filter to apply to the pins.'),
    creative_types: z.array(z.string()).optional().describe('Pin creative types filter.')
});

const OutputSchema = z.object({
    items: z.array(PinSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page.')
});

const ProviderPinSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
    alt_text: z.string().nullable().optional(),
    board_id: z.string().optional(),
    board_section_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    creative_type: z.string().nullable().optional(),
    dominant_color: z.string().nullable().optional(),
    has_been_promoted: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_product: z.boolean().optional(),
    is_standard: z.boolean().optional(),
    parent_pin_id: z.string().nullable().optional(),
    media: z.unknown().nullable().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(z.unknown()),
    bookmark: z.string().nullable().optional()
});

const action = createAction({
    description: 'List pins owned by the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/pins/list
            endpoint: '/v5/pins',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.board_id !== undefined && { board_id: input.board_id }),
                ...(input.pin_filter !== undefined && { pin_filter: input.pin_filter }),
                ...(input.creative_types !== undefined && { creative_types: input.creative_types.join(',') })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item) => {
            const parsed = ProviderPinSchema.parse(item);
            return parsed;
        });

        return {
            items,
            ...(providerResponse.bookmark !== undefined && providerResponse.bookmark !== null && { next_cursor: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
