import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Unique identifier of the board. Example: "1099300658984851677"'),
    section_id: z.string().describe('Unique identifier of the board section. Example: "3662612923485353472"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Number of pins to return per page.')
});

const ProviderPinSchema = z.object({
    id: z.string(),
    board_id: z.string().optional(),
    board_section_id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
    alt_text: z.string().nullable().optional(),
    created_at: z.string().optional(),
    has_been_promoted: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_product: z.boolean().optional(),
    is_standard: z.boolean().optional(),
    parent_pin_id: z.string().nullable().optional(),
    dominant_color: z.string().nullable().optional(),
    media: z.unknown().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            board_id: z.string().optional(),
            board_section_id: z.string().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            link: z.string().optional(),
            alt_text: z.string().optional(),
            created_at: z.string().optional(),
            has_been_promoted: z.boolean().optional(),
            is_owner: z.boolean().optional(),
            is_product: z.boolean().optional(),
            is_standard: z.boolean().optional(),
            parent_pin_id: z.string().optional(),
            dominant_color: z.string().optional(),
            media: z.unknown().optional()
        })
    ),
    next_bookmark: z.string().optional()
});

const action = createAction({
    description: 'List pins within a specific board section',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/board_sections/list_pins
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}/sections/${encodeURIComponent(input.section_id)}/pins`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const ProviderResponseSchema = z.object({
            bookmark: z.string().nullable().optional(),
            items: z.array(z.unknown())
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        const items = parsedResponse.items.map((item: unknown) => {
            const providerPin = ProviderPinSchema.parse(item);
            return {
                id: providerPin.id,
                ...(providerPin.board_id !== undefined && { board_id: providerPin.board_id }),
                ...(providerPin.board_section_id != null && { board_section_id: providerPin.board_section_id }),
                ...(providerPin.title != null && { title: providerPin.title }),
                ...(providerPin.description != null && { description: providerPin.description }),
                ...(providerPin.link != null && { link: providerPin.link }),
                ...(providerPin.alt_text != null && { alt_text: providerPin.alt_text }),
                ...(providerPin.created_at !== undefined && { created_at: providerPin.created_at }),
                ...(providerPin.has_been_promoted !== undefined && { has_been_promoted: providerPin.has_been_promoted }),
                ...(providerPin.is_owner !== undefined && { is_owner: providerPin.is_owner }),
                ...(providerPin.is_product !== undefined && { is_product: providerPin.is_product }),
                ...(providerPin.is_standard !== undefined && { is_standard: providerPin.is_standard }),
                ...(providerPin.parent_pin_id != null && { parent_pin_id: providerPin.parent_pin_id }),
                ...(providerPin.dominant_color != null && { dominant_color: providerPin.dominant_color }),
                ...(providerPin.media !== undefined && { media: providerPin.media })
            };
        });

        return {
            items,
            ...(parsedResponse.bookmark != null && { next_bookmark: parsedResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
