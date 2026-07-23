import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().optional().describe('Number of records to request. Defaults to 50.'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order for policy names. Defaults to asc.')
});

const ProviderPolicySchema = z.object({
    policyName: z.string(),
    updatedAt: z.string(),
    sslInspection: z.enum(['enabled', 'disabled']),
    clashCount: z.number().optional()
});

const ProviderPageInfoSchema = z.object({
    endCursor: z.string().nullable(),
    hasNextPage: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        policies: z.array(ProviderPolicySchema),
        pageInfo: ProviderPageInfoSchema
    })
});

const OutputSchema = z.object({
    policies: z.array(ProviderPolicySchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List all policies, paginated by name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: '/v1/policies',
            params: {
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.first !== undefined && { first: String(input.first) }),
                ...(input.order !== undefined && { order: input.order })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            policies: parsed.data.policies,
            ...(parsed.data.pageInfo.hasNextPage && parsed.data.pageInfo.endCursor != null && { nextCursor: parsed.data.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
