import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderCompanyTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    entries: z.array(ProviderCompanyTagSchema),
    pagination: ProviderPaginationSchema
});

const CompanyTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    tags: z.array(CompanyTagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tags available for tagging companies.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

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
            endpoint: 'api/v3/admin/company_tags',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            tags: parsed.entries.map((tag) => ({
                id: tag.id,
                name: tag.name,
                ...(tag.created_at !== undefined && { created_at: tag.created_at }),
                ...(tag.updated_at !== undefined && { updated_at: tag.updated_at })
            })),
            ...(parsed.pagination.page < parsed.pagination.pages && { next_cursor: String(parsed.pagination.page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
