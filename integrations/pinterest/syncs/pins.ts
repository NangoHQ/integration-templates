import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PinSchema = z.object({
    id: z.string().describe('The unique identifier of the Pin, e.g. 1099300590356451849'),
    alt_text: z.string().optional(),
    board_id: z.string().optional().describe('The board to which this Pin belongs, e.g. 1099300658984851677'),
    board_section_id: z.string().optional(),
    created_at: z.string().optional().describe('The date and time when the Pin was created, in ISO 8601 format'),
    description: z.string().optional(),
    dominant_color: z.string().optional(),
    has_been_promoted: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_product: z.boolean().optional(),
    is_standard: z.boolean().optional(),
    link: z.string().optional().describe('The URL the Pin links to'),
    media: z.unknown().optional(),
    parent_pin_id: z.string().optional().describe('The source Pin id if this Pin was saved from another Pin'),
    pin_metrics: z.unknown().optional(),
    title: z.string().optional()
});

const RawPinSchema = z.object({
    id: z.string(),
    alt_text: z.string().nullable().optional(),
    board_id: z.string().nullable().optional(),
    board_section_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    dominant_color: z.string().nullable().optional(),
    has_been_promoted: z.boolean().nullable().optional(),
    is_owner: z.boolean().nullable().optional(),
    is_product: z.boolean().nullable().optional(),
    is_standard: z.boolean().nullable().optional(),
    link: z.string().nullable().optional(),
    media: z.unknown().nullable().optional(),
    parent_pin_id: z.string().nullable().optional(),
    pin_metrics: z.unknown().nullable().optional(),
    title: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync pins.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['pins:read'],
    models: {
        Pin: PinSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v5/pins does not expose an updated-since or modified-since filter,
        // so every run must walk the full dataset. The bookmark cursor is used for intra-run
        // pagination only; it is not restored across runs because delete tracking requires
        // starting from page 1 every time.
        await nango.trackDeletesStart('Pin');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/pins/list
            endpoint: '/v5/pins',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const pins = page.map((item) => {
                if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                    throw new Error('Expected pin to be an object');
                }

                const parsed = RawPinSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse pin: ${parsed.error.message}`);
                }

                const raw = parsed.data;
                return {
                    id: raw.id,
                    ...(raw.alt_text != null && { alt_text: raw.alt_text }),
                    ...(raw.board_id != null && { board_id: raw.board_id }),
                    ...(raw.board_section_id != null && { board_section_id: raw.board_section_id }),
                    ...(raw.created_at != null && { created_at: raw.created_at }),
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.dominant_color != null && { dominant_color: raw.dominant_color }),
                    ...(raw.has_been_promoted != null && { has_been_promoted: raw.has_been_promoted }),
                    ...(raw.is_owner != null && { is_owner: raw.is_owner }),
                    ...(raw.is_product != null && { is_product: raw.is_product }),
                    ...(raw.is_standard != null && { is_standard: raw.is_standard }),
                    ...(raw.link != null && { link: raw.link }),
                    ...(raw.media != null && { media: raw.media }),
                    ...(raw.parent_pin_id != null && { parent_pin_id: raw.parent_pin_id }),
                    ...(raw.pin_metrics != null && { pin_metrics: raw.pin_metrics }),
                    ...(raw.title != null && { title: raw.title })
                };
            });

            if (pins.length > 0) {
                await nango.batchSave(pins, 'Pin');
            }
        }

        await nango.trackDeletesEnd('Pin');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
