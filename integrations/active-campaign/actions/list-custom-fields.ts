import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Default: 20, Max: 100.'),
    perstag: z.string().optional().describe('Filter by persistent tag. Example: CUSTOMER_GROUP')
});

const FieldSchema = z.object({
    id: z.string(),
    title: z.string(),
    descript: z.string().nullable().optional(),
    type: z.string().optional(),
    isrequired: z.string().optional(),
    perstag: z.string().optional(),
    defval: z.string().nullable().optional(),
    show_in_list: z.string().optional(),
    rows: z.string().optional(),
    cols: z.string().optional(),
    visible: z.string().optional(),
    service: z.string().optional(),
    ordernum: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    options: z.array(z.unknown()).optional(),
    relations: z.array(z.unknown()).optional(),
    links: z
        .object({
            options: z.string().optional(),
            relations: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(FieldSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List contact custom fields from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && (Number.isNaN(offset) || offset < 0 || String(offset) !== input.cursor)) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'cursor must be a valid non-negative integer string.' });
        }
        const limit = input.limit ?? 20;

        // https://developers.activecampaign.com/reference/retrieve-fields
        const response = await nango.get({
            endpoint: '/3/fields',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.perstag && { 'filters[perstag]': input.perstag })
            },
            retries: 3
        });

        const rawData = z
            .object({
                fields: z.array(z.unknown()).optional(),
                meta: z
                    .object({
                        total: z.union([z.string(), z.number()]).optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const fields = (rawData.fields ?? []).map((item: unknown) => FieldSchema.parse(item));

        const total =
            typeof rawData.meta?.total === 'string' ? parseInt(rawData.meta.total, 10) : typeof rawData.meta?.total === 'number' ? rawData.meta.total : 0;

        const nextCursor = offset + limit < total ? String(offset + limit) : undefined;

        return {
            items: fields,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
