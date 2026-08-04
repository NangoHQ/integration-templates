import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page.')
});

const ProviderSubmittalPackageSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    name: z.string(),
    number: z.string(),
    description: z.string().nullable(),
    specification_section_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.string(),
    updated_by: z.string()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderSubmittalPackageSchema),
    total: z.number(),
    page: z.number().nullable(),
    per_page: z.number().nullable(),
    first_page_url: z.string().nullable(),
    last_page_url: z.string().nullable(),
    next_page_url: z.string().nullable(),
    prev_page_url: z.string().nullable()
});

const SubmittalPackageSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    name: z.string(),
    number: z.string(),
    description: z.string().optional(),
    specification_section_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.string(),
    updated_by: z.string()
});

const OutputSchema = z.object({
    items: z.array(SubmittalPackageSchema),
    total: z.number(),
    page: z.number().nullable().optional(),
    per_page: z.number().nullable().optional(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional(),
    next_cursor: z.string().optional()
});

function extractPageFromUrl(urlString: string | null): string | undefined {
    if (!urlString) {
        return undefined;
    }
    const match = urlString.match(/[?&]page=(\d+)/);
    return match ? match[1] : undefined;
}

const action = createAction({
    description: 'List submittal packages (groupings of related submittals) for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;

        const response = await nango.get({
            // https://api.ingenious.build/reference/v2-get-submittal-packages-list.md
            endpoint: '/api/v2/pub/submittal-packages',
            params: {
                project_id: input.project_id,
                page: page,
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);
        const nextCursor = extractPageFromUrl(providerResponse.next_page_url);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                project_id: item.project_id,
                name: item.name,
                number: item.number,
                ...(item.description != null && { description: item.description }),
                ...(item.specification_section_id != null && { specification_section_id: item.specification_section_id }),
                created_at: item.created_at,
                updated_at: item.updated_at,
                created_by: item.created_by,
                updated_by: item.updated_by
            })),
            total: providerResponse.total,
            ...(providerResponse.page != null && { page: providerResponse.page }),
            ...(providerResponse.per_page != null && { per_page: providerResponse.per_page }),
            ...(providerResponse.first_page_url != null && { first_page_url: providerResponse.first_page_url }),
            ...(providerResponse.last_page_url != null && { last_page_url: providerResponse.last_page_url }),
            ...(providerResponse.next_page_url != null && { next_page_url: providerResponse.next_page_url }),
            ...(providerResponse.prev_page_url != null && { prev_page_url: providerResponse.prev_page_url }),
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
