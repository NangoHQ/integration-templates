import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().optional().describe('Number of results per page. Default ~30, max 200.')
});

const ThemeSchema = z
    .object({
        background: z
            .object({
                brightness: z.number().optional(),
                href: z.string().optional(),
                layout: z.string().optional()
            })
            .optional(),
        colors: z
            .object({
                answer: z.string().optional(),
                background: z.string().optional(),
                button: z.string().optional(),
                question: z.string().optional()
            })
            .optional(),
        fields: z
            .object({
                alignment: z.string().optional(),
                font_size: z.string().optional()
            })
            .optional(),
        font: z.string().optional(),
        has_transparent_button: z.boolean().optional(),
        id: z.string(),
        name: z.string().optional(),
        origin: z.string().optional(),
        rounded_corners: z.string().optional(),
        screens: z
            .object({
                alignment: z.string().optional(),
                font_size: z.string().optional()
            })
            .optional(),
        source_theme_id: z.string().optional(),
        visibility: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ThemeSchema),
    next_cursor: z.string().optional(),
    page_count: z.number(),
    total_items: z.number()
});

const action = createAction({
    description: 'List themes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }

        // https://www.typeform.com/developers/create/reference/retrieve-themes/
        const response = await nango.get({
            endpoint: '/themes',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                page_count: z.number(),
                total_items: z.number(),
                items: z.array(z.unknown())
            })
            .parse(response.data);

        const currentPage = input.cursor !== undefined ? parseInt(input.cursor, 10) : 1;
        const nextPage = currentPage < providerResponse.page_count ? String(currentPage + 1) : undefined;

        return {
            items: providerResponse.items.map((item: unknown) => ThemeSchema.parse(item)),
            ...(nextPage !== undefined && { next_cursor: nextPage }),
            page_count: providerResponse.page_count,
            total_items: providerResponse.total_items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
