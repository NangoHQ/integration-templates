import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderLeadStatusSchema = z.object({
    id: z.number().describe('Lead status ID. Example: 1'),
    name: z.string().describe('Lead status name. Example: "Archived"'),
    hex_color: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: ProviderPaginationSchema.optional()
});

const OutputSchema = z.object({
    entries: z.array(ProviderLeadStatusSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List lead statuses configured for People records.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/lead_statuses',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const entries = providerResponse.entries.map((entry) => {
            return ProviderLeadStatusSchema.parse(entry);
        });

        const nextCursor =
            providerResponse.pagination && providerResponse.pagination.page < providerResponse.pagination.pages
                ? String(providerResponse.pagination.page + 1)
                : undefined;

        return {
            entries,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
