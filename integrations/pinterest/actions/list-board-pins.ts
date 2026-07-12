import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "1099300658984851770"'),
    cursor: z.string().optional().describe('Pagination bookmark from the previous response. Omit for the first page.')
});

const ProviderPinSchema = z
    .object({
        id: z.string(),
        board_id: z.string().optional(),
        board_section_id: z.string().nullable().optional(),
        created_at: z.string().optional(),
        dominant_color: z.string().nullable().optional(),
        has_been_promoted: z.boolean().optional(),
        is_owner: z.boolean().optional(),
        is_product: z.boolean().optional(),
        is_standard: z.boolean().optional(),
        media: z.object({}).passthrough().optional(),
        parent_pin_id: z.string().nullable().optional(),
        pin_metrics: z.object({}).passthrough().nullable().optional(),
        alt_text: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
        title: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(ProviderPinSchema)
});

const PinSchema = z.object({
    id: z.string(),
    board_id: z.string().optional(),
    board_section_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    dominant_color: z.string().nullable().optional(),
    has_been_promoted: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_product: z.boolean().optional(),
    is_standard: z.boolean().optional(),
    media: z.object({}).passthrough().optional(),
    parent_pin_id: z.string().nullable().optional(),
    pin_metrics: z.object({}).passthrough().nullable().optional(),
    alt_text: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
    title: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(PinSchema),
    next_bookmark: z.string().optional()
});

const action = createAction({
    description: 'List pins on a board',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/boards/list_pins
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}/pins`,
            params: {
                ...(input.cursor !== undefined ? { bookmark: input.cursor } : {})
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((pin) => ({
                id: pin.id,
                ...(pin.board_id !== undefined && { board_id: pin.board_id }),
                ...(pin.board_section_id != null && { board_section_id: pin.board_section_id }),
                ...(pin.created_at !== undefined && { created_at: pin.created_at }),
                ...(pin.dominant_color != null && { dominant_color: pin.dominant_color }),
                ...(pin.has_been_promoted !== undefined && { has_been_promoted: pin.has_been_promoted }),
                ...(pin.is_owner !== undefined && { is_owner: pin.is_owner }),
                ...(pin.is_product !== undefined && { is_product: pin.is_product }),
                ...(pin.is_standard !== undefined && { is_standard: pin.is_standard }),
                ...(pin.media !== undefined && { media: pin.media }),
                ...(pin.parent_pin_id != null && { parent_pin_id: pin.parent_pin_id }),
                ...(pin.pin_metrics != null && { pin_metrics: pin.pin_metrics }),
                ...(pin.alt_text != null && { alt_text: pin.alt_text }),
                ...(pin.description != null && { description: pin.description }),
                ...(pin.link != null && { link: pin.link }),
                ...(pin.title != null && { title: pin.title })
            })),
            ...(providerResponse.bookmark != null && { next_bookmark: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
