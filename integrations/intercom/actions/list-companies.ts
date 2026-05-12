import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response pages.next.starting_after. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of results per page. Maximum 150.')
});

const PlanSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional()
});

const TagsWrapperSchema = z.object({
    type: z.string().optional(),
    tags: z.array(z.unknown()).optional()
});

const SegmentsWrapperSchema = z.object({
    type: z.string().optional(),
    segments: z.array(z.unknown()).optional()
});

const CompanySchema = z.object({
    type: z.string().optional(),
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    company_id: z.string().optional(),
    app_id: z.union([z.string(), z.number()]).optional(),
    plan: PlanSchema.optional(),
    monthly_spend: z.union([z.number(), z.null()]).optional(),
    session_count: z.union([z.number(), z.null()]).optional(),
    user_count: z.union([z.number(), z.null()]).optional(),
    size: z.union([z.number(), z.null()]).optional(),
    website: z.union([z.string(), z.null()]).optional(),
    industry: z.union([z.string(), z.null()]).optional(),
    remote_created_at: z.union([z.number(), z.null()]).optional(),
    created_at: z.union([z.number(), z.null()]).optional(),
    updated_at: z.union([z.number(), z.null()]).optional(),
    tags: TagsWrapperSchema.optional(),
    segments: SegmentsWrapperSchema.optional()
});

const PagesSchema = z.object({
    type: z.string().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    next: z
        .union([
            z.object({
                page: z.number().optional(),
                starting_after: z.string()
            }),
            z.null()
        ])
        .optional()
});

const ProviderResponseSchema = z.object({
    type: z.string().optional(),
    data: z.array(CompanySchema).optional(),
    pages: PagesSchema.optional(),
    total_count: z.number().optional()
});

const OutputSchema = z.object({
    companies: z.array(CompanySchema),
    starting_after: z.string().optional()
});

const action = createAction({
    description: 'List companies with cursor-based pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-companies',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['companies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Companies/listCompanies
        const response = await nango.get({
            endpoint: '/companies',
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.cursor && { starting_after: input.cursor })
            },
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Intercom API',
                details: parsedResponse.error.issues
            });
        }

        const data = parsedResponse.data;

        return {
            companies: data.data ?? [],
            ...(data.pages?.next?.starting_after !== undefined && {
                starting_after: data.pages.next.starting_after
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
