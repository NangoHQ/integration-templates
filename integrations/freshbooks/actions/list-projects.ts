import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()]).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().int().min(1).max(30).optional().describe('Number of items per page. Max 30.')
});

const MetaSchema = z.object({
    total: z.number(),
    per_page: z.number(),
    page: z.number(),
    pages: z.number()
});

const ProjectSchema = z
    .object({
        id: z.number(),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        client_id: z.number().nullable().optional(),
        project_type: z.string().nullable().optional(),
        complete: z.boolean().nullable().optional(),
        active: z.boolean().nullable().optional(),
        internal: z.boolean().nullable().optional(),
        due_date: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        budget: z.number().nullable().optional(),
        rate: z.string().nullable().optional(),
        fixed_price: z.string().nullable().optional(),
        billing_method: z.string().nullable().optional(),
        logged_duration: z.number().nullable().optional()
    })
    .passthrough();

const ListResponseSchema = z.object({
    meta: MetaSchema,
    projects: z.array(ProjectSchema)
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(rawMetadata);

        if (!parsedMetadata.success || !parsedMetadata.data.businessId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'businessId is required in connection metadata. Run get-account-id first.'
            });
        }

        const businessId = String(parsedMetadata.data.businessId);
        const page = input.cursor !== undefined ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }

        const perPage = input.per_page ?? 30;

        // https://www.freshbooks.com/api/project
        const response = await nango.get({
            endpoint: `/projects/business/${encodeURIComponent(businessId)}/projects`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const listData = ListResponseSchema.safeParse(response.data);
        if (!listData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const hasNextPage = listData.data.meta.page < listData.data.meta.pages;

        return {
            items: listData.data.projects,
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
