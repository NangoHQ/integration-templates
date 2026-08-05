import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    page: z.number().optional().describe('Page number. Defaults to 1.'),
    per_page: z.number().optional().describe('Items per page. Defaults to 15.')
});

const SubmittalTypeSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        is_required_for_material_release: z.boolean(),
        created_by: z.string().nullable(),
        created_at: z.string(),
        updated_by: z.string().nullable(),
        updated_at: z.string(),
        project_id: z.string().nullable().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    items: z.array(SubmittalTypeSchema),
    total: z.number(),
    page: z.number().nullable(),
    per_page: z.number().nullable(),
    first_page_url: z.string().nullable(),
    last_page_url: z.string().nullable(),
    next_page_url: z.string().nullable(),
    prev_page_url: z.string().nullable()
});

const OutputSchema = z.object({
    items: z.array(SubmittalTypeSchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List submittal types configured for a project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.page ?? 1;
        const perPage = input.per_page ?? 15;

        const response = await nango.get({
            // https://api.ingenious.build/reference/v2-get-submittal-types-list.md
            endpoint: '/api/v2/pub/submittal-types',
            params: {
                project_id: input.project_id,
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerData = ProviderListResponseSchema.parse(response.data);
        const nextPage = providerData.next_page_url != null ? page + 1 : undefined;

        return {
            items: providerData.items,
            total: providerData.total,
            page: providerData.page ?? page,
            per_page: providerData.per_page ?? perPage,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
