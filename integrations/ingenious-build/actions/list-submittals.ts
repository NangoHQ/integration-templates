import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    page: z.number().optional().describe('Page number. Defaults to 1.'),
    per_page: z.number().optional().describe('Items per page. Defaults to 15.')
});

const ProviderSubmittalSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    package_id: z.string().nullable(),
    status: z.string(),
    type_id: z.string().nullable(),
    title: z.string(),
    number: z.string(),
    description: z.string().nullable(),
    due_date: z.string().nullable(),
    ball_in_court_id: z.string().nullable(),
    submittal_manager_id: z.string().nullable(),
    official_reviewer_id: z.string().nullable(),
    additional_reviewer_ids: z.array(z.string()),
    impacted_party_ids: z.array(z.string()),
    responsible_contractor_id: z.string().nullable(),
    document_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderSubmittalSchema),
    total: z.number(),
    page: z.number().nullable(),
    per_page: z.number().nullable(),
    first_page_url: z.string().nullable(),
    last_page_url: z.string().nullable(),
    next_page_url: z.string().nullable(),
    prev_page_url: z.string().nullable()
});

const OutputItemSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    package_id: z.string().optional(),
    status: z.string(),
    type_id: z.string().optional(),
    title: z.string(),
    number: z.string(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    ball_in_court_id: z.string().optional(),
    submittal_manager_id: z.string().optional(),
    official_reviewer_id: z.string().optional(),
    additional_reviewer_ids: z.array(z.string()),
    impacted_party_ids: z.array(z.string()),
    responsible_contractor_id: z.string().optional(),
    document_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List submittals for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.ingenious.build/reference/v2-get-submittals-list.md
            endpoint: '/api/v2/pub/submittals',
            params: {
                project_id: input.project_id,
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const hasNextPage = listResponse.next_page_url !== null;

        return {
            items: listResponse.items.map((item) => ({
                id: item.id,
                project_id: item.project_id,
                ...(item.package_id != null && { package_id: item.package_id }),
                status: item.status,
                ...(item.type_id != null && { type_id: item.type_id }),
                title: item.title,
                number: item.number,
                ...(item.description != null && { description: item.description }),
                ...(item.due_date != null && { due_date: item.due_date }),
                ...(item.ball_in_court_id != null && { ball_in_court_id: item.ball_in_court_id }),
                ...(item.submittal_manager_id != null && { submittal_manager_id: item.submittal_manager_id }),
                ...(item.official_reviewer_id != null && { official_reviewer_id: item.official_reviewer_id }),
                additional_reviewer_ids: item.additional_reviewer_ids,
                impacted_party_ids: item.impacted_party_ids,
                ...(item.responsible_contractor_id != null && { responsible_contractor_id: item.responsible_contractor_id }),
                document_ids: item.document_ids,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(hasNextPage && listResponse.page !== null && { next_page: listResponse.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
