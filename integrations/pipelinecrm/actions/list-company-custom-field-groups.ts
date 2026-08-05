import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const ProviderCustomFieldGroupSchema = z.object({
    id: z.number(),
    type: z.string().optional(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(ProviderCustomFieldGroupSchema),
    pagination: ProviderPaginationSchema.optional()
});

const OutputItemSchema = z.object({
    id: z.number(),
    type: z.string().optional(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List custom field groups defined for companies.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/admin/company_custom_field_groups.json',
            params: {
                page: String(page)
            },
            retries: 3,
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3'
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.entries.map((entry) => ({
            id: entry.id,
            ...(entry.type !== undefined && { type: entry.type }),
            ...(entry.name !== undefined && { name: entry.name }),
            ...(entry.created_at !== undefined && { created_at: entry.created_at }),
            ...(entry.updated_at !== undefined && { updated_at: entry.updated_at })
        }));

        const pagination = providerResponse.pagination;
        let next_page: number | undefined;
        if (pagination && pagination.page * pagination.per_page < pagination.total) {
            next_page = pagination.page + 1;
        }

        return {
            items,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
