import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results to return per page (1-100). Defaults to the API default.')
});

const EeoResponseSchema = z.object({
    applicationArchivedAt: z.number().nullable().optional(),
    applicationArchivedBy: z.string().nullable().optional(),
    appliedAt: z.union([z.string(), z.number()]).optional(),
    currentStage: z.string().optional(),
    gender: z.string().optional(),
    race: z.string().optional(),
    veteran: z.string().optional(),
    disability: z.string().optional(),
    disabilitySignatureDate: z.string().optional()
});

const OutputSchema = z.object({
    responses: z.array(EeoResponseSchema),
    next: z.string().optional()
});

const action = createAction({
    description: 'Get anonymous EEO (Equal Employment Opportunity) survey responses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['eeo_responses:read:admin'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#retrieve-eeo-for-all-postings
            endpoint: '/v1/eeo/responses',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                data: z.array(EeoResponseSchema),
                next: z.string().optional()
            })
            .parse(response.data);

        return {
            responses: providerResponse.data,
            ...(providerResponse.next !== undefined && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
