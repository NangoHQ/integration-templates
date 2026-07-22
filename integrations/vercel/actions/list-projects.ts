import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the `until` query parameter. Omit for the first page.'),
    teamId: z.string().optional().describe('The Team identifier to perform the request on behalf of.'),
    search: z.string().optional().describe('Search projects by the name field. Max length 100.'),
    limit: z.number().optional().describe('Limit the number of projects returned.')
});

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        accountId: z.string().optional()
    })
    .passthrough();

const ProviderArrayResponseSchema = z.array(ProviderProjectSchema);

const ProviderObjectResponseSchema = z.object({
    projects: z.array(ProviderProjectSchema),
    pagination: z
        .object({
            count: z.number(),
            next: z.number().nullable().optional(),
            prev: z.union([z.string(), z.number()]).nullable().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.union([ProviderObjectResponseSchema, ProviderArrayResponseSchema]);

const OutputSchema = z.object({
    projects: z.array(ProviderProjectSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#get-projects
            endpoint: '/v9/projects',
            params: {
                ...(input.cursor !== undefined && { until: input.cursor }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (Array.isArray(providerResponse)) {
            return {
                projects: providerResponse,
                nextCursor: undefined
            };
        }

        return {
            projects: providerResponse.projects,
            ...(providerResponse.pagination?.next != null && { nextCursor: String(providerResponse.pagination.next) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
