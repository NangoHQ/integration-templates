import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of results per page (default 20, max 100).')
});

const ProviderFormSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        action: z.string().optional(),
        actiondata: z.record(z.string(), z.unknown()).optional(),
        submitdata: z.record(z.string(), z.unknown()).optional(),
        style: z.record(z.string(), z.unknown()).optional(),
        options: z.record(z.string(), z.unknown()).optional(),
        cfields: z.array(z.record(z.string(), z.unknown())).optional(),
        links: z.record(z.string(), z.unknown()).optional(),
        address: z.unknown().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    forms: z.array(z.unknown()),
    meta: z.object({
        total: z.union([z.string(), z.number()])
    })
});

const OutputSchema = z.object({
    forms: z.array(ProviderFormSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List forms from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-forms',
        group: 'Forms'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 20;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/forms-1
            endpoint: '/3/forms',
            params: {
                limit: String(limit),
                offset: String(offset)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const forms = providerResponse.forms.map((form) => ProviderFormSchema.parse(form));

        const total = Number(providerResponse.meta.total);
        const nextOffset = offset + limit;
        const next_cursor = nextOffset < total ? String(nextOffset) : undefined;

        return {
            forms,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
