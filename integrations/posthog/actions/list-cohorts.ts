import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of results to return per page. Example: 100')
});

const ProviderCohortSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    deleted: z.boolean().optional(),
    is_calculating: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    last_calculation: z.string().nullable().optional(),
    count: z.number().nullable().optional(),
    is_static: z.boolean().optional(),
    cohort_type: z.string().nullable().optional(),
    errors_calculating: z.number().optional(),
    last_error_message: z.string().nullable().optional()
});

const CohortSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    deleted: z.boolean().optional(),
    is_calculating: z.boolean().optional(),
    created_at: z.string().optional(),
    last_calculation: z.string().optional(),
    count: z.number().nullable().optional(),
    is_static: z.boolean().optional(),
    cohort_type: z.string().optional(),
    errors_calculating: z.number().optional(),
    last_error_message: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(CohortSchema),
    next_cursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    count: z.number().optional(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
    results: z.array(z.unknown())
});

const action = createAction({
    description: 'List cohorts from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['cohort:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const projectId = input.project_id;

        const response = await nango.get({
            // https://posthog.com/docs/api/cohorts
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/cohorts/`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.results.map((item) => {
            const parsed = ProviderCohortSchema.parse(item);
            return {
                id: parsed.id,
                ...(parsed.name != null && { name: parsed.name }),
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.deleted !== undefined && { deleted: parsed.deleted }),
                ...(parsed.is_calculating !== undefined && { is_calculating: parsed.is_calculating }),
                ...(parsed.created_at != null && { created_at: parsed.created_at }),
                ...(parsed.last_calculation != null && { last_calculation: parsed.last_calculation }),
                ...(parsed.count !== undefined && { count: parsed.count }),
                ...(parsed.is_static !== undefined && { is_static: parsed.is_static }),
                ...(parsed.cohort_type != null && { cohort_type: parsed.cohort_type }),
                ...(parsed.errors_calculating !== undefined && { errors_calculating: parsed.errors_calculating }),
                ...(parsed.last_error_message != null && { last_error_message: parsed.last_error_message })
            };
        });

        let nextCursor: string | undefined;
        if (providerResponse.next != null) {
            const nextUrl = new URL(providerResponse.next);
            const offset = nextUrl.searchParams.get('offset');
            if (offset != null && offset !== '') {
                nextCursor = offset;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
