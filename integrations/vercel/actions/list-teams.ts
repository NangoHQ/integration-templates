import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of teams to return.')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    avatar: z.string().nullable().optional(),
    creatorId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    stagingPrefix: z.string().nullable().optional(),
    createdAt: z.number().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
    limited: z.boolean().nullable().optional(),
    limitedBy: z.string().nullable().optional()
});

const ProviderPaginationSchema = z.object({
    count: z.number(),
    next: z.number().nullable(),
    prev: z.number().nullable()
});

const ProviderResponseSchema = z.object({
    teams: z.array(ProviderTeamSchema),
    pagination: ProviderPaginationSchema
});

const OutputSchema = z.object({
    teams: z.array(ProviderTeamSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List teams.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/teams/list-all-teams
            endpoint: '/v2/teams',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { until: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            teams: providerResponse.teams,
            ...(providerResponse.pagination.next != null && {
                nextCursor: String(providerResponse.pagination.next)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
